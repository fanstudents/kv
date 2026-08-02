import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseOrdersRepository } from "@/adapters/orders/supabase-orders-repository";
import type { Database } from "@/lib/database.types";
import type { OrdersRepository } from "@/modules/orders/orders";

const FIXTURE_PREFIX = "codex-orders-local-db:";
const ORDERS_AGENT_SLUG = "orders";
const ORDERS_AGENT_FIXTURE_NAME = "Codex local Orders DB acceptance fixture";
const orderId = `${FIXTURE_PREFIX}order:${randomUUID()}`;
const activitySummary = `${FIXTURE_PREFIX}activity:${randomUUID()}`;

let localClient: SupabaseClient<Database> | null = null;
let repository: OrdersRepository | null = null;
let createdOrdersAgentFixture = false;

beforeAll(async () => {
  const { url, serviceRoleKey } = requireLocalAcceptanceEnvironment();
  localClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const { data: existingAgent, error: existingAgentError } = await localClient
    .from("line_agents")
    .select("slug")
    .eq("slug", ORDERS_AGENT_SLUG)
    .maybeSingle();
  if (existingAgentError) {
    throw new Error(`Orders local DB acceptance cannot inspect the Orders Agent: ${existingAgentError.message}`);
  }

  if (!existingAgent) {
    const { error: insertAgentError } = await localClient.from("line_agents").insert({
      slug: ORDERS_AGENT_SLUG,
      name: ORDERS_AGENT_FIXTURE_NAME,
      enabled: false,
      settings: {},
    });
    if (insertAgentError) {
      throw new Error(`Orders local DB acceptance cannot create its local fixture Agent: ${insertAgentError.message}`);
    }
    createdOrdersAgentFixture = true;
  }

  repository = createSupabaseOrdersRepository(localClient);
});

afterAll(async () => {
  if (!localClient) return;

  const cleanupErrors: string[] = [];
  const captureCleanupError = (label: string, error: { message: string } | null) => {
    if (error) cleanupErrors.push(`${label}: ${error.message}`);
  };

  const { error: activityCleanupError } = await localClient
    .from("line_agent_activity")
    .delete()
    .eq("agent_slug", ORDERS_AGENT_SLUG)
    .eq("summary", activitySummary);
  captureCleanupError("activity", activityCleanupError);

  const { error: orderCleanupError } = await localClient
    .from("teachify_orders")
    .delete()
    .eq("order_id", orderId);
  captureCleanupError("order", orderCleanupError);

  if (createdOrdersAgentFixture) {
    const { error: agentCleanupError } = await localClient
      .from("line_agents")
      .delete()
      .eq("slug", ORDERS_AGENT_SLUG)
      .eq("name", ORDERS_AGENT_FIXTURE_NAME);
    captureCleanupError("fixture Agent", agentCleanupError);
  }

  if (cleanupErrors.length > 0) {
    throw new Error(`Orders local DB acceptance cleanup failed: ${cleanupErrors.join("; ")}`);
  }
});

describe("Orders local Main DB persistence", () => {
  it("persists the repository's current order and activity row shapes", async () => {
    const localRepository = repository;
    const client = localClient;
    if (!localRepository || !client) {
      throw new Error("Orders local DB acceptance fixture did not initialize");
    }

    await localRepository.upsertOrder({
      id: orderId,
      tradeNo: "LOCAL-INITIAL",
      amount: 1680,
      currency: "TWD",
      userName: "Codex Local Fixture",
      userEmail: "codex-orders-local@example.test",
      itemNames: ["Local DB fixture"],
      couponCode: "LOCAL-INITIAL",
      isRefund: false,
      paidAt: "2026-08-02T00:00:00.000Z",
    });
    await localRepository.upsertOrder({
      id: orderId,
      tradeNo: "LOCAL-UPDATED",
      amount: 1780,
      currency: "TWD",
      userName: "Codex Local Fixture Updated",
      userEmail: "codex-orders-local@example.test",
      itemNames: ["Local DB fixture", "Upsert update"],
      couponCode: "LOCAL-UPDATED",
      isRefund: true,
      paidAt: "2026-08-02T01:00:00.000Z",
    });
    await localRepository.recordActivity({ summary: activitySummary, status: "success" });

    const { data: persistedOrder, error: persistedOrderError } = await client
      .from("teachify_orders")
      .select("id,order_id,trade_no,amount,currency,user_name,user_email,item_names,coupon_code,is_refund,paid_at,source,created_at")
      .eq("order_id", orderId)
      .single();
    expect(persistedOrderError).toBeNull();
    expect(persistedOrder).toMatchObject({
      order_id: orderId,
      trade_no: "LOCAL-UPDATED",
      amount: 1780,
      currency: "TWD",
      user_name: "Codex Local Fixture Updated",
      user_email: "codex-orders-local@example.test",
      item_names: ["Local DB fixture", "Upsert update"],
      coupon_code: "LOCAL-UPDATED",
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

function requireLocalAcceptanceEnvironment(): { url: string; serviceRoleKey: string } {
  if (process.env.ORDERS_LOCAL_DB_ACCEPTANCE !== "1") {
    throw new Error(
      "Orders local DB acceptance is opt-in. Set ORDERS_LOCAL_DB_ACCEPTANCE=1 before running npm run test:integration:orders:local."
    );
  }

  const url = process.env.KV_LOCAL_SUPABASE_URL;
  const serviceRoleKey = process.env.KV_LOCAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Orders local DB acceptance requires KV_LOCAL_SUPABASE_URL and KV_LOCAL_SUPABASE_SERVICE_ROLE_KEY. It never reads SUPABASE_URL or .env.local."
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("KV_LOCAL_SUPABASE_URL must be an absolute HTTP(S) URL on localhost, 127.0.0.1, or [::1].");
  }

  const allowedHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if ((parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") || !allowedHosts.has(parsedUrl.hostname)) {
    throw new Error(
      `Refusing Orders local DB acceptance against non-loopback KV_LOCAL_SUPABASE_URL host: ${parsedUrl.hostname || "(missing host)"}`
    );
  }

  return { url, serviceRoleKey };
}
