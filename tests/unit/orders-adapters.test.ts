import { describe, expect, it, vi } from "vitest";

const { buildPushMessages, pushLineRawMessages } = vi.hoisted(() => ({
  buildPushMessages: vi.fn(),
  pushLineRawMessages: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/line", () => ({ pushLineRawMessages }));
vi.mock("@/lib/line-message-styles", () => ({ buildPushMessages }));

import { createLineOrdersDelivery } from "@/adapters/orders/line-orders-delivery";
import { createSupabaseOrdersRepository } from "@/adapters/orders/supabase-orders-repository";

describe("Orders external boundaries", () => {
  it("keeps the existing tables, conflict key, Agent selector, and activity row", async () => {
    const ordersQuery = { upsert: vi.fn().mockResolvedValue({ error: null }) };
    const configQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: { enabled: true, settings: { reportTo: "U123" } } }),
    };
    configQuery.select.mockReturnValue(configQuery);
    configQuery.eq.mockReturnValue(configQuery);
    const activityQuery = { insert: vi.fn().mockResolvedValue({ error: null }) };
    const from = vi.fn((table: string) => {
      if (table === "teachify_orders") return ordersQuery;
      if (table === "line_agents") return configQuery;
      return activityQuery;
    });
    const repository = createSupabaseOrdersRepository({ from } as never);

    await repository.upsertOrder({
      id: "order-1",
      tradeNo: "T-1",
      amount: 1680,
      currency: "TWD",
      userName: "Dennis",
      userEmail: "dennis@example.test",
      itemNames: ["產品化工作坊"],
      couponCode: "EARLY",
      isRefund: false,
      paidAt: "2026-07-31T01:00:00.000Z",
    });
    await expect(repository.getAgentConfig()).resolves.toEqual({
      enabled: true,
      settings: { reportTo: "U123" },
    });
    await repository.recordActivity({ summary: "sent", status: "success" });

    expect(ordersQuery.upsert).toHaveBeenCalledWith(
      {
        order_id: "order-1",
        trade_no: "T-1",
        amount: 1680,
        currency: "TWD",
        user_name: "Dennis",
        user_email: "dennis@example.test",
        item_names: ["產品化工作坊"],
        coupon_code: "EARLY",
        is_refund: false,
        paid_at: "2026-07-31T01:00:00.000Z",
        source: "webhook",
      },
      { onConflict: "order_id" }
    );
    expect(configQuery.select).toHaveBeenCalledWith("enabled, settings");
    expect(configQuery.eq).toHaveBeenCalledWith("slug", "orders");
    expect(activityQuery.insert).toHaveBeenCalledWith({
      agent_slug: "orders",
      summary: "sent",
      status: "success",
    });
  });

  it("renders and delivers both webhook and test messages through one LINE boundary", async () => {
    buildPushMessages.mockReturnValue([{ type: "text", text: "demo" }]);
    pushLineRawMessages.mockResolvedValue(undefined);
    const delivery = createLineOrdersDelivery();

    await delivery.deliver({
      recipient: "U123",
      style: "buttons",
      text: "demo",
      title: "新訂單通知（測試）",
      accentColor: "#F59E0B",
    });

    expect(buildPushMessages).toHaveBeenCalledWith({
      style: "buttons",
      text: "demo",
      title: "新訂單通知（測試）",
      accentColor: "#F59E0B",
    });
    expect(pushLineRawMessages).toHaveBeenCalledWith("U123", [{ type: "text", text: "demo" }]);
  });
});
