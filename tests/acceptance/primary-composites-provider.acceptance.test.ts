import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createLineOrdersDelivery } from "@/adapters/orders/line-orders-delivery";
import { createSupabaseOrdersRepository } from "@/adapters/orders/supabase-orders-repository";
import { runTeamLeadReport } from "@/adapters/reporting/daily-report-runners";
import { createLineSubscribersBroadcastAdapter } from "@/adapters/subscribers/line-broadcast-adapter";
import type { Json } from "@/lib/database.types";
import { getMainSupabase } from "@/lib/supabase";
import { processOrderPayload } from "@/modules/orders/orders";
import {
  parseSubscribersBroadcastRequest,
  runSubscribersBroadcast,
} from "@/modules/subscribers/broadcast";
import { requireStagingMainDatabaseEnvironment } from "../integration/staging-main-db";

const GATE = "PRIMARY_COMPOSITE_ACCEPTANCE";
const COMMAND = "npm run acceptance:primary:composites";
const EXPECTED_MESSAGE_COUNT = 3;

type AgentSnapshot = {
  slug: string;
  enabled: boolean;
  settings: Json;
};

type SubscriberSnapshot = {
  id: string;
  channel: string;
  display_name: string | null;
  first_seen_at: string;
  last_seen_at: string;
  line_user_id: string;
  note: string | null;
  picture_url: string | null;
  tags: string[];
};

const client = getMainSupabase();
let recipient = "";
let marker = "";
let startedAt = "";
let agentSnapshots: AgentSnapshot[] = [];
let subscriberSnapshot: SubscriberSnapshot | null = null;
let createdSubscriberId: string | null = null;
let syntheticActivityId: string | null = null;
let activityIdsBefore = new Set<string>();

function requireGate(): void {
  requireStagingMainDatabaseEnvironment(GATE, COMMAND);
  if (process.env[GATE] !== "1") {
    throw new Error(`${GATE} is opt-in; no provider calls were made.`);
  }
  if (Number(process.env.PRIMARY_COMPOSITE_ACCEPTANCE_MAX_MESSAGES) !== EXPECTED_MESSAGE_COUNT) {
    throw new Error(`PRIMARY_COMPOSITE_ACCEPTANCE_MAX_MESSAGES must be exactly ${EXPECTED_MESSAGE_COUNT}.`);
  }

  recipient = process.env.LINE_ACCEPTANCE_USER_ID?.trim() ?? "";
  if (!/^U[0-9a-f]{32}$/i.test(recipient)) {
    throw new Error("LINE_ACCEPTANCE_USER_ID must be exactly one allowlisted LINE user ID.");
  }
  if (!process.env.LINE_CHANNEL_ID || !process.env.LINE_CHANNEL_SECRET || !process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error("Primary LINE channel credentials are incomplete; no message was sent.");
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for the Team Lead composite; no message was sent.");
  }
}

async function restoreAgentSnapshots(): Promise<void> {
  for (const snapshot of agentSnapshots) {
    const { error } = await client
      .from("line_agents")
      .update({ enabled: snapshot.enabled, settings: snapshot.settings })
      .eq("slug", snapshot.slug);
    if (error) throw new Error(`Agent settings restore failed (${snapshot.slug}): ${error.message}`);
  }
}

async function cleanupAcceptanceRows(): Promise<void> {
  if (marker) {
    const orderCleanup = await client.from("teachify_orders").delete().eq("order_id", `${marker}-order`);
    if (orderCleanup.error) throw new Error(`Orders cleanup failed: ${orderCleanup.error.message}`);

    const broadcastCleanup = await client.from("broadcast_logs").delete().eq("message_text", marker);
    if (broadcastCleanup.error) throw new Error(`Broadcast cleanup failed: ${broadcastCleanup.error.message}`);
  }

  const activityIds = new Set<string>();
  if (syntheticActivityId) activityIds.add(syntheticActivityId);
  if (startedAt) {
    const { data, error } = await client
      .from("line_agent_activity")
      .select("id, agent_slug, summary")
      .gte("occurred_at", startedAt)
      .in("agent_slug", ["orders", "teamlead"]);
    if (error) throw new Error(`Activity cleanup lookup failed: ${error.message}`);
    for (const row of data ?? []) {
      if (!activityIdsBefore.has(row.id)) activityIds.add(row.id);
    }
  }
  if (activityIds.size > 0) {
    const { error } = await client.from("line_agent_activity").delete().in("id", [...activityIds]);
    if (error) throw new Error(`Activity cleanup failed: ${error.message}`);
  }

  if (subscriberSnapshot) {
    const { error } = await client
      .from("line_subscribers")
      .update({
        channel: subscriberSnapshot.channel,
        display_name: subscriberSnapshot.display_name,
        first_seen_at: subscriberSnapshot.first_seen_at,
        last_seen_at: subscriberSnapshot.last_seen_at,
        note: subscriberSnapshot.note,
        picture_url: subscriberSnapshot.picture_url,
        tags: subscriberSnapshot.tags,
      })
      .eq("id", subscriberSnapshot.id);
    if (error) throw new Error(`Subscriber restore failed: ${error.message}`);
  } else if (createdSubscriberId) {
    const { error } = await client.from("line_subscribers").delete().eq("id", createdSubscriberId);
    if (error) throw new Error(`Subscriber cleanup failed: ${error.message}`);
  }
}

beforeAll(async () => {
  requireGate();
  marker = `KV-PRIMARY-COMPOSITE-${Date.now()}`;
  startedAt = new Date().toISOString();

  const agents = await client
    .from("line_agents")
    .select("slug, enabled, settings")
    .in("slug", ["orders", "teamlead"]);
  if (agents.error) throw new Error(`Agent settings snapshot failed: ${agents.error.message}`);
  agentSnapshots = (agents.data ?? []) as AgentSnapshot[];
  if (agentSnapshots.length !== 2) throw new Error("Orders and Team Lead Agent rows must both exist.");

  const subscriber = await client
    .from("line_subscribers")
    .select("*")
    .eq("line_user_id", recipient)
    .maybeSingle();
  if (subscriber.error) throw new Error(`Subscriber snapshot failed: ${subscriber.error.message}`);
  subscriberSnapshot = subscriber.data as SubscriberSnapshot | null;

  const activitiesBefore = await client
    .from("line_agent_activity")
    .select("id")
    .in("agent_slug", ["orders", "teamlead"])
    .gte("occurred_at", startedAt);
  if (activitiesBefore.error) throw new Error(`Activity snapshot failed: ${activitiesBefore.error.message}`);
  activityIdsBefore = new Set((activitiesBefore.data ?? []).map((row) => row.id));

  for (const snapshot of agentSnapshots) {
    const settings = snapshot.settings && typeof snapshot.settings === "object" && !Array.isArray(snapshot.settings)
      ? snapshot.settings as Record<string, unknown>
      : {};
    const update = await client
      .from("line_agents")
      .update({ enabled: true, settings: { ...settings, reportTo: recipient, pushStyle: "text" } })
      .eq("slug", snapshot.slug);
    if (update.error) throw new Error(`Agent settings preparation failed (${snapshot.slug}): ${update.error.message}`);
  }

  const preparedSubscriber = await client
    .from("line_subscribers")
    .upsert({
      line_user_id: recipient,
      channel: "primary",
      display_name: subscriberSnapshot?.display_name ?? "KV Acceptance",
      note: subscriberSnapshot?.note ?? "Controlled staging acceptance fixture",
      tags: [...new Set([...(subscriberSnapshot?.tags ?? []), marker])],
    }, { onConflict: "line_user_id" })
    .select("id")
    .single();
  if (preparedSubscriber.error) throw new Error(`Subscriber preparation failed: ${preparedSubscriber.error.message}`);
  if (!subscriberSnapshot) createdSubscriberId = preparedSubscriber.data.id;
});

afterAll(async () => {
  const failures: string[] = [];
  for (const cleanup of [cleanupAcceptanceRows, restoreAgentSnapshots]) {
    try {
      await cleanup();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (failures.length > 0) throw new Error(failures.join("; "));
});

describe.sequential("controlled Primary LINE composite acceptance", () => {
  it("broadcasts to one tagged Primary subscriber and records the exact counts", async () => {
    const parsed = parseSubscribersBroadcastRequest({
      tags: [marker],
      channel: "primary",
      text: marker,
      style: "text",
      title: "KV Staging Acceptance",
      accentColor: "#06C755",
    });
    const result = await runSubscribersBroadcast(parsed, createLineSubscribersBroadcastAdapter());
    expect(result).toEqual({
      kind: "ok",
      data: { ok: true, recipientCount: 1, successCount: 1, failedCount: 0 },
    });

    const log = await client
      .from("broadcast_logs")
      .select("recipient_count, success_count, failed_count")
      .eq("message_text", marker)
      .single();
    expect(log.error).toBeNull();
    expect(log.data).toEqual({ recipient_count: 1, success_count: 1, failed_count: 0 });
  });

  it("persists one synthetic order, sends Primary LINE, and records activity", async () => {
    const payload = {
      id: `${marker}-order`,
      trade_no: marker,
      amount: 1,
      currency: "TWD",
      user_name: "KV Acceptance",
      user_email: "acceptance@example.invalid",
      items: [{ name: "Controlled staging fixture" }],
      paid_at: startedAt,
    };
    const result = await processOrderPayload({
      payload,
      rawBody: JSON.stringify(payload),
      dependencies: {
        repository: createSupabaseOrdersRepository(client),
        delivery: createLineOrdersDelivery(),
      },
    });
    expect(result).toEqual({ type: "delivered" });

    const order = await client
      .from("teachify_orders")
      .select("order_id, trade_no, source")
      .eq("order_id", `${marker}-order`)
      .single();
    expect(order.error).toBeNull();
    expect(order.data).toEqual({ order_id: `${marker}-order`, trade_no: marker, source: "webhook" });
  });

  it("summarizes a controlled activity and delivers the Team Lead report", async () => {
    const inserted = await client
      .from("line_agent_activity")
      .insert({ agent_slug: "visit", summary: marker, status: "success" })
      .select("id")
      .single();
    if (inserted.error) throw new Error(`Synthetic activity insert failed: ${inserted.error.message}`);
    syntheticActivityId = inserted.data.id;

    await expect(runTeamLeadReport()).resolves.toEqual({
      ok: true,
      message: expect.stringMatching(/^晨報已送出，彙整 \d+ 筆團隊動態$/),
    });

    const teamLeadActivity = await client
      .from("line_agent_activity")
      .select("id, status, summary")
      .eq("agent_slug", "teamlead")
      .gte("occurred_at", startedAt)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .single();
    expect(teamLeadActivity.error).toBeNull();
    expect(teamLeadActivity.data).toMatchObject({ status: "success" });
    expect(teamLeadActivity.data?.summary).toContain("已向老闆送出每日晨報");
  });
});
