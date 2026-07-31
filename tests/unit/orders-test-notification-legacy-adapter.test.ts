import { describe, expect, it, vi } from "vitest";

const { buildPushMessages, pushLineRawMessages, getSupabase } = vi.hoisted(() => ({
  buildPushMessages: vi.fn(),
  pushLineRawMessages: vi.fn(),
  getSupabase: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/line", () => ({ pushLineRawMessages }));
vi.mock("@/lib/line-message-styles", () => ({ buildPushMessages }));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyOrdersTestNotificationAdapter } from "@/adapters/orders/legacy-orders-test-notification-adapter";

describe("legacy orders test-notification adapter", () => {
  it("keeps the existing config query, LINE delivery, and activity row", async () => {
    const configQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: { settings: { reportTo: "U123" } } }),
    };
    configQuery.select.mockReturnValue(configQuery);
    configQuery.eq.mockReturnValue(configQuery);
    const activityQuery = { insert: vi.fn().mockResolvedValue({ error: null }) };
    const from = vi.fn((table: string) => (table === "line_agents" ? configQuery : activityQuery));
    getSupabase.mockReturnValue({ from });
    buildPushMessages.mockReturnValue([{ type: "text", text: "demo" }]);
    pushLineRawMessages.mockResolvedValue(undefined);
    const adapter = createLegacyOrdersTestNotificationAdapter();

    await expect(adapter.getAgentConfig()).resolves.toEqual({ settings: { reportTo: "U123" } });
    await adapter.send({
      recipient: "U123",
      style: "buttons",
      text: "demo",
      title: "新訂單通知（測試）",
      accentColor: "#F59E0B",
    });
    await adapter.recordActivity({ summary: "sent", status: "success" });

    expect(configQuery.select).toHaveBeenCalledWith("settings");
    expect(configQuery.eq).toHaveBeenCalledWith("slug", "orders");
    expect(buildPushMessages).toHaveBeenCalledWith({
      style: "buttons",
      text: "demo",
      title: "新訂單通知（測試）",
      accentColor: "#F59E0B",
    });
    expect(pushLineRawMessages).toHaveBeenCalledWith("U123", [{ type: "text", text: "demo" }]);
    expect(activityQuery.insert).toHaveBeenCalledWith({
      agent_slug: "orders",
      summary: "sent",
      status: "success",
    });
  });
});
