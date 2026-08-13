import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { createSupportRelayDependencies } from "@/adapters/support/support-relay-dependencies";
import { createSupabaseSupportReportRepository } from "@/adapters/support/supabase-support-report-repository";
import { POST as postSupportLogReply } from "@/app/api/agents/support/log-reply/route";
import type { Json } from "@/lib/database.types";
import { getMainSupabase } from "@/lib/supabase";
import { runSupportReport } from "@/modules/support/report";
import { processSupportRelay, type SupportRelayForwardRequest } from "@/modules/support/relay";
import { requireStagingMainDatabaseEnvironment } from "../integration/staging-main-db";

const GATE = "SUPPORT_MAIN_ACCEPTANCE";
const COMMAND = "npm run acceptance:support:main";
const client = getMainSupabase();

type AgentSnapshot = {
  enabled: boolean;
  settings: Json;
};

let marker = "";
let lineUserId = "";
let subscriberId: string | null = null;
let agentSnapshot: AgentSnapshot | null = null;
let originalLogSecret: string | undefined;
let activityIdsBefore = new Set<string>();
let forwardedRequest: SupportRelayForwardRequest | null = null;
let deliveredReport = "";

function requireGate(): void {
  requireStagingMainDatabaseEnvironment(GATE, COMMAND);
  if (process.env[GATE] !== "1") {
    throw new Error(`${GATE} is opt-in; no Main staging rows were written.`);
  }
}

async function restoreAndCleanup(): Promise<void> {
  if (lineUserId) {
    const conversations = await client
      .from("line_support_conversations")
      .delete()
      .eq("line_user_id", lineUserId);
    if (conversations.error) throw new Error(`Conversation cleanup failed: ${conversations.error.message}`);
  }

  if (subscriberId) {
    const subscriber = await client.from("line_subscribers").delete().eq("id", subscriberId);
    if (subscriber.error) throw new Error(`Subscriber cleanup failed: ${subscriber.error.message}`);
  }

  const currentActivities = await client
    .from("line_agent_activity")
    .select("id")
    .eq("agent_slug", "support");
  if (currentActivities.error) throw new Error(`Activity cleanup lookup failed: ${currentActivities.error.message}`);
  const createdActivityIds = (currentActivities.data ?? [])
    .map((row) => row.id)
    .filter((id) => !activityIdsBefore.has(id));
  if (createdActivityIds.length > 0) {
    const activities = await client.from("line_agent_activity").delete().in("id", createdActivityIds);
    if (activities.error) throw new Error(`Activity cleanup failed: ${activities.error.message}`);
  }

  if (agentSnapshot) {
    const restored = await client
      .from("line_agents")
      .update({ enabled: agentSnapshot.enabled, settings: agentSnapshot.settings })
      .eq("slug", "support");
    if (restored.error) throw new Error(`Support Agent restore failed: ${restored.error.message}`);
  }

  if (originalLogSecret === undefined) delete process.env.SUPPORT_LOG_SECRET;
  else process.env.SUPPORT_LOG_SECRET = originalLogSecret;
}

beforeAll(async () => {
  requireGate();
  marker = `KV-SUPPORT-MAIN-${Date.now()}`;
  lineUserId = `U${Date.now().toString(16).padStart(32, "0").slice(-32)}`;
  originalLogSecret = process.env.SUPPORT_LOG_SECRET;
  process.env.SUPPORT_LOG_SECRET = randomUUID();

  const agent = await client
    .from("line_agents")
    .select("enabled, settings")
    .eq("slug", "support")
    .single();
  if (agent.error) throw new Error(`Support Agent snapshot failed: ${agent.error.message}`);
  agentSnapshot = agent.data as AgentSnapshot;

  const activities = await client
    .from("line_agent_activity")
    .select("id")
    .eq("agent_slug", "support");
  if (activities.error) throw new Error(`Support activity snapshot failed: ${activities.error.message}`);
  activityIdsBefore = new Set((activities.data ?? []).map((row) => row.id));

  const settings = agentSnapshot.settings && typeof agentSnapshot.settings === "object" && !Array.isArray(agentSnapshot.settings)
    ? agentSnapshot.settings as Record<string, unknown>
    : {};
  const preparedAgent = await client
    .from("line_agents")
    .update({ enabled: true, settings: { ...settings, reportTo: lineUserId, pushStyle: "text" } })
    .eq("slug", "support");
  if (preparedAgent.error) throw new Error(`Support Agent preparation failed: ${preparedAgent.error.message}`);

  const subscriber = await client
    .from("line_subscribers")
    .insert({
      line_user_id: lineUserId,
      channel: "support",
      display_name: "KV Support Acceptance",
      note: marker,
      tags: [marker],
    })
    .select("id")
    .single();
  if (subscriber.error) throw new Error(`Support subscriber preparation failed: ${subscriber.error.message}`);
  subscriberId = subscriber.data.id;
});

afterAll(async () => {
  await restoreAndCleanup();

  const [conversations, subscribers, activities] = await Promise.all([
    client.from("line_support_conversations").select("id", { count: "exact", head: true }).eq("line_user_id", lineUserId),
    client.from("line_subscribers").select("id", { count: "exact", head: true }).eq("line_user_id", lineUserId),
    client.from("line_agent_activity").select("id").eq("agent_slug", "support"),
  ]);
  if (conversations.error || subscribers.error || activities.error) {
    throw new Error("Support acceptance residue verification failed.");
  }
  expect(conversations.count).toBe(0);
  expect(subscribers.count).toBe(0);
  expect(new Set((activities.data ?? []).map((row) => row.id))).toEqual(activityIdsBefore);
});

describe("Support Main staging acceptance", () => {
  it("captures a synthetic customer message and authenticated bot callback", async () => {
    const productionPorts = createSupportRelayDependencies(client);
    await processSupportRelay({
      rawBody: JSON.stringify({ events: [{ marker }] }),
      signature: "local-signature-fixture",
      contentType: "application/json",
      events: [{
        type: "message",
        source: { userId: lineUserId },
        message: { type: "text", text: `${marker} customer question` },
      }],
      ports: {
        ...productionPorts,
        relay: { async forward(request) { forwardedRequest = request; } },
        subscribers: { async touch() { /* isolated from Support LINE profile provider */ } },
      },
    });

    expect(forwardedRequest).toMatchObject({
      signature: "local-signature-fixture",
      contentType: "application/json",
    });

    const callback = await postSupportLogReply(new NextRequest("http://localhost/api/agents/support/log-reply", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-log-secret": process.env.SUPPORT_LOG_SECRET ?? "",
      },
      body: JSON.stringify({ userId: lineUserId, text: `${marker} bot reply` }),
    }));
    expect(callback.status).toBe(200);

    const conversations = await client
      .from("line_support_conversations")
      .select("role, text")
      .eq("line_user_id", lineUserId)
      .order("occurred_at", { ascending: true });
    if (conversations.error) throw new Error(conversations.error.message);
    expect(conversations.data).toEqual([
      { role: "customer", text: `${marker} customer question` },
      { role: "bot", text: `${marker} bot reply` },
    ]);
  });

  it("builds the daily report and records both success and delivery failure truth", async () => {
    const productionRepository = createSupabaseSupportReportRepository(client);
    const repository = {
      ...productionRepository,
      async listCustomerMessages(cutoff: string) {
        const messages = await productionRepository.listCustomerMessages(cutoff);
        return messages.filter((message) => message.line_user_id === lineUserId);
      },
    };
    const result = await runSupportReport({
      dependencies: {
        repository,
        summary: { async summarize(rawBrief) { return `${marker} summary: ${rawBrief}`; } },
        delivery: { async deliver(delivery) { deliveredReport = delivery.text; } },
      },
      clock: { nowMs: () => Date.now(), nowDate: () => new Date() },
    });
    expect(result).toEqual({ ok: true, message: "客服彙報已送出（1 位客戶、1 則留言）" });
    expect(deliveredReport).toContain(marker);

    const failed = await runSupportReport({
      dependencies: {
        repository,
        summary: { async summarize() { return null; } },
        delivery: { async deliver() { throw new Error("synthetic delivery unavailable"); } },
      },
      clock: { nowMs: () => Date.now(), nowDate: () => new Date() },
    });
    expect(failed).toEqual({ ok: false, message: "synthetic delivery unavailable" });

    const activities = await client
      .from("line_agent_activity")
      .select("id, summary, status")
      .eq("agent_slug", "support");
    if (activities.error) throw new Error(activities.error.message);
    const created = (activities.data ?? []).filter((row) => !activityIdsBefore.has(row.id));
    expect(created).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: "success" }),
      expect.objectContaining({ summary: expect.stringContaining("synthetic delivery unavailable"), status: "failed" }),
    ]));
  });
});
