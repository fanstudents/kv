import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseOrdersRepository } from "@/adapters/orders/supabase-orders-repository";
import type { Database } from "@/lib/database.types";
import type { OrdersRepository } from "@/modules/orders/orders";
import {
  createStagingMainDatabaseClient,
  requireStagingMainDatabaseEnvironment,
} from "./staging-main-db";

const FIXTURE_PREFIX = "codex-orders-staging-db:";
const ORDERS_AGENT_SLUG = "orders";
const ORDERS_AGENT_FIXTURE_NAME = "Codex staging Orders DB acceptance fixture";
const orderId = `${FIXTURE_PREFIX}order:${randomUUID()}`;
const activitySummary = `${FIXTURE_PREFIX}activity:${randomUUID()}`;

let stagingClient: SupabaseClient<Database> | null = null;
let repository: OrdersRepository | null = null;
let createdOrdersAgentFixture = false;

beforeAll(async () => {
  const environment = requireStagingMainDatabaseEnvironment(
    "ORDERS_STAGING_DB_ACCEPTANCE",
    "npm run test:integration:orders:staging",
  );
  stagingClient = createStagingMainDatabaseClient(environment);

  const { data: existingAgent, error: existingAgentError } = await stagingClient
    .from("line_agents")
    .select("slug")
    .eq("slug", ORDERS_AGENT_SLUG)
    .maybeSingle();
  if (existingAgentError) {
    throw new Error(`Orders staging DB acceptance cannot inspect the Orders Agent: ${existingAgentError.message}`);
  }

  if (!existingAgent) {
    const { error: insertAgentError } = await stagingClient.from("line_agents").insert({
      slug: ORDERS_AGENT_SLUG,
      name: ORDERS_AGENT_FIXTURE_NAME,
      enabled: false,
      settings: {},
    });
    if (insertAgentError) {
      throw new Error(`Orders staging DB acceptance cannot create its fixture Agent: ${insertAgentError.message}`);
    }
    createdOrdersAgentFixture = true;
  }

  repository = createSupabaseOrdersRepository(stagingClient);
});

afterAll(async () => {
  if (!stagingClient) return;

  const cleanupErrors: string[] = [];
  const captureCleanupError = (label: string, error: { message: string } | null) => {
    if (error) cleanupErrors.push(`${label}: ${error.message}`);
  };

  const { error: activityCleanupError } = await stagingClient
    .from("line_agent_activity")
    .delete()
    .eq("agent_slug", ORDERS_AGENT_SLUG)
    .eq("summary", activitySummary);
  captureCleanupError("activity", activityCleanupError);

  const { error: orderCleanupError } = await stagingClient
    .from("teachify_orders")
    .delete()
    .eq("order_id", orderId);
  captureCleanupError("order", orderCleanupError);

  if (createdOrdersAgentFixture) {
    const { error: agentCleanupError } = await stagingClient
      .from("line_agents")
      .delete()
      .eq("slug", ORDERS_AGENT_SLUG)
      .eq("name", ORDERS_AGENT_FIXTURE_NAME);
    captureCleanupError("fixture Agent", agentCleanupError);
  }

  if (cleanupErrors.length > 0) {
    throw new Error(`Orders staging DB acceptance cleanup failed: ${cleanupErrors.join("; ")}`);
  }
});

describe("Orders staging Main DB persistence", () => {
  it("persists the repository's current order and activity row shapes", async () => {
    const stagingRepository = repository;
    const client = stagingClient;
    if (!stagingRepository || !client) {
      throw new Error("Orders staging DB acceptance fixture did not initialize");
    }

    await expect(stagingRepository.getAgentConfig()).resolves.toMatchObject({ enabled: false });

    await stagingRepository.upsertOrder({
      id: orderId,
      tradeNo: "STAGING-INITIAL",
      amount: 1680,
      currency: "TWD",
      userName: "Codex Staging Fixture",
      userEmail: "codex-orders-staging@example.test",
      itemNames: ["Staging DB fixture"],
      couponCode: "STAGING-INITIAL",
      isRefund: false,
      paidAt: "2026-08-02T00:00:00.000Z",
    });
    await stagingRepository.upsertOrder({
      id: orderId,
      tradeNo: "STAGING-UPDATED",
      amount: 1780,
      currency: "TWD",
      userName: "Codex Staging Fixture Updated",
      userEmail: "codex-orders-staging@example.test",
      itemNames: ["Staging DB fixture", "Upsert update"],
      couponCode: "STAGING-UPDATED",
      isRefund: true,
      paidAt: "2026-08-02T01:00:00.000Z",
    });
    await stagingRepository.recordActivity({ summary: activitySummary, status: "success" });

    const { data: persistedOrder, error: persistedOrderError } = await client
      .from("teachify_orders")
      .select("id,order_id,trade_no,amount,currency,user_name,user_email,item_names,coupon_code,is_refund,paid_at,source,created_at")
      .eq("order_id", orderId)
      .single();
    expect(persistedOrderError).toBeNull();
    expect(persistedOrder).toMatchObject({
      order_id: orderId,
      trade_no: "STAGING-UPDATED",
      amount: 1780,
      currency: "TWD",
      user_name: "Codex Staging Fixture Updated",
      user_email: "codex-orders-staging@example.test",
      item_names: ["Staging DB fixture", "Upsert update"],
      coupon_code: "STAGING-UPDATED",
      is_refund: true,
      source: "webhook",
    });
    expect(persistedOrder?.id).toEqual(expect.any(String));
    expect(persistedOrder?.created_at).toEqual(expect.any(String));
    expect(new Date(persistedOrder?.paid_at ?? "").toISOString()).toBe("2026-08-02T01:00:00.000Z");

    const { data: persistedActivity, error: persistedActivityError } = await client
      .from("line_agent_activity")
      .select("id,agent_slug,summary,status,occurred_at")
      .eq("agent_slug", ORDERS_AGENT_SLUG)
      .eq("summary", activitySummary)
      .single();
    expect(persistedActivityError).toBeNull();
    expect(persistedActivity).toMatchObject({
      agent_slug: ORDERS_AGENT_SLUG,
      summary: activitySummary,
      status: "success",
    });
    expect(persistedActivity?.id).toEqual(expect.any(String));
    expect(persistedActivity?.occurred_at).toEqual(expect.any(String));
  });
});
