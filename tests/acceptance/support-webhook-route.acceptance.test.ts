import { createHash, createHmac } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST as postSupportWebhook } from "@/app/api/line/webhook/support/route";
import { getMainSupabase } from "@/lib/supabase";
import { requireStagingMainDatabaseEnvironment } from "../integration/staging-main-db";

const GATE = "SUPPORT_ROUTE_ACCEPTANCE";
const COMMAND = "npm run acceptance:support:route";
const client = getMainSupabase();
const simulatorScript = fileURLToPath(new URL("../../scripts/support-relay-simulator.mjs", import.meta.url));

let child: ChildProcess | null = null;
let simulatorUrl = "";
let originalRelayTarget: string | undefined;
let lineUserId = "";
let marker = "";
let activityIdsBefore = new Set<string>();

async function startSimulator(): Promise<string> {
  const lineSecret = process.env.LINE_SUPPORT_CHANNEL_SECRET;
  if (!lineSecret) throw new Error("LINE_SUPPORT_CHANNEL_SECRET is required; no route acceptance was sent.");

  child = spawn(process.execPath, [simulatorScript], {
    env: {
      ...process.env,
      SUPPORT_RELAY_SIMULATOR_HOST: "127.0.0.1",
      SUPPORT_RELAY_SIMULATOR_PORT: "0",
      SUPPORT_RELAY_SIMULATOR_MODE: "ack",
      SUPPORT_RELAY_SIMULATOR_OUTCOME: "success",
      SUPPORT_RELAY_SIMULATOR_SECRET: `${marker}-simulator-secret`,
      LINE_SUPPORT_CHANNEL_SECRET: lineSecret,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`relay simulator did not start: ${output}`)), 5000);

    child?.stdout?.on("data", (chunk) => {
      output += chunk.toString();
      for (const line of output.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as { ready?: boolean; port?: number };
          if (parsed.ready && parsed.port) {
            clearTimeout(timeout);
            resolve(`http://127.0.0.1:${parsed.port}`);
            return;
          }
        } catch {
          // Wait for the complete JSON line.
        }
      }
    });
    child?.stderr?.on("data", (chunk) => { output += chunk.toString(); });
    child?.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child?.once("exit", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`relay simulator exited with ${code}: ${output}`));
      }
    });
  });
}

async function stopSimulator(): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    once(child, "exit").catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, 1000)),
  ]);
}

async function cleanup(): Promise<void> {
  if (lineUserId) {
    const conversations = await client.from("line_support_conversations").delete().eq("line_user_id", lineUserId);
    if (conversations.error) throw new Error(`Support conversation cleanup failed: ${conversations.error.message}`);

    const subscribers = await client.from("line_subscribers").delete().eq("line_user_id", lineUserId);
    if (subscribers.error) throw new Error(`Support subscriber cleanup failed: ${subscribers.error.message}`);
  }

  const activities = await client.from("line_agent_activity").select("id").eq("agent_slug", "support");
  if (activities.error) throw new Error(`Support activity cleanup lookup failed: ${activities.error.message}`);
  const createdIds = (activities.data ?? []).map((row) => row.id).filter((id) => !activityIdsBefore.has(id));
  if (createdIds.length > 0) {
    const deleted = await client.from("line_agent_activity").delete().in("id", createdIds);
    if (deleted.error) throw new Error(`Support activity cleanup failed: ${deleted.error.message}`);
  }

  if (originalRelayTarget === undefined) delete process.env.SUPPORT_RELAY_TARGET_URL;
  else process.env.SUPPORT_RELAY_TARGET_URL = originalRelayTarget;
  await stopSimulator();
}

beforeAll(async () => {
  requireStagingMainDatabaseEnvironment(GATE, COMMAND);
  if (!process.env.LINE_SUPPORT_CHANNEL_SECRET) {
    throw new Error("LINE_SUPPORT_CHANNEL_SECRET is required; no route acceptance was sent.");
  }

  marker = `KV-SUPPORT-ROUTE-${Date.now()}`;
  lineUserId = `U${Date.now().toString(16).padStart(32, "0").slice(-32)}`;
  originalRelayTarget = process.env.SUPPORT_RELAY_TARGET_URL;

  const activities = await client.from("line_agent_activity").select("id").eq("agent_slug", "support");
  if (activities.error) throw new Error(`Support activity snapshot failed: ${activities.error.message}`);
  activityIdsBefore = new Set((activities.data ?? []).map((row) => row.id));

  const subscriber = await client.from("line_subscribers").insert({
    line_user_id: lineUserId,
    channel: "support",
    display_name: "KV Support Route Acceptance",
    note: marker,
    tags: [marker],
  });
  if (subscriber.error) throw new Error(`Support subscriber preparation failed: ${subscriber.error.message}`);

  simulatorUrl = await startSimulator();
  process.env.SUPPORT_RELAY_TARGET_URL = `${simulatorUrl}/relay`;
});

afterAll(async () => {
  await cleanup();

  const [conversations, subscribers, activities] = await Promise.all([
    client.from("line_support_conversations").select("id", { count: "exact", head: true }).eq("line_user_id", lineUserId),
    client.from("line_subscribers").select("id", { count: "exact", head: true }).eq("line_user_id", lineUserId),
    client.from("line_agent_activity").select("id").eq("agent_slug", "support"),
  ]);
  if (conversations.error || subscribers.error || activities.error) {
    throw new Error("Support route acceptance residue verification failed.");
  }
  expect(conversations.count).toBe(0);
  expect(subscribers.count).toBe(0);
  expect(new Set((activities.data ?? []).map((row) => row.id))).toEqual(activityIdsBefore);
});

describe.sequential("Support webhook route acceptance", () => {
  it("verifies, captures, relays to the simulator, and leaves cleanable staging evidence", async () => {
    const rawBody = JSON.stringify({
      destination: "support-route-acceptance",
      events: [{
        type: "message",
        replyToken: "route-acceptance-reply-token",
        source: { type: "user", userId: lineUserId },
        message: { type: "text", text: marker },
      }],
    });
    const signature = createHmac("sha256", process.env.LINE_SUPPORT_CHANNEL_SECRET ?? "")
      .update(rawBody)
      .digest("base64");

    const response = await postSupportWebhook(new NextRequest("http://localhost/api/line/webhook/support", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-line-signature": signature,
      },
      body: rawBody,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });

    const receiptsResponse = await fetch(`${simulatorUrl}/receipts`, {
      headers: { "x-simulator-secret": `${marker}-simulator-secret` },
    });
    expect(receiptsResponse.status).toBe(200);
    const expectedDeliveryKey = `body:${createHash("sha256").update(rawBody, "utf8").digest("hex")}`;
    await expect(receiptsResponse.json()).resolves.toMatchObject({
      receipts: [{ deliveryKey: expectedDeliveryKey, eventCount: 1, eventTypes: ["message"], outcome: "received" }],
    });

    const subscriber = await client
      .from("line_subscribers")
      .select("line_user_id, channel, note")
      .eq("line_user_id", lineUserId)
      .single();
    if (subscriber.error) throw new Error(`Support subscriber read failed: ${subscriber.error.message}`);
    expect(subscriber.data).toMatchObject({ line_user_id: lineUserId, channel: "support" });

    const conversation = await client
      .from("line_support_conversations")
      .select("role, text")
      .eq("line_user_id", lineUserId)
      .single();
    if (conversation.error) throw new Error(`Support conversation read failed: ${conversation.error.message}`);
    expect(conversation.data).toEqual({ role: "customer", text: marker });

    const activity = await client
      .from("line_agent_activity")
      .select("summary, status")
      .eq("agent_slug", "support")
      .ilike("summary", `%${marker}%`);
    if (activity.error) throw new Error(`Support activity read failed: ${activity.error.message}`);
    expect(activity.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: "success" }),
    ]));
  });
});
