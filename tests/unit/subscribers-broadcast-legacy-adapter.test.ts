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

import { createLegacySubscribersBroadcastAdapter } from "@/adapters/subscribers/legacy-broadcast-adapter";

function chain<T>(result: T) {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    overlaps: vi.fn(),
    eq: vi.fn(),
    then: Promise.resolve(result).then.bind(Promise.resolve(result)),
  };
  query.select.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.overlaps.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

describe("legacy subscribers broadcast adapter", () => {
  it("keeps the broadcast log query and subscriber filters", async () => {
    const logsQuery = chain({ data: [{ id: "log-1" }], error: null });
    const recipientsQuery = chain({ data: [{ id: "s1", line_user_id: "U1", channel: "support" }], error: null });
    const from = vi.fn((table: string) => (table === "broadcast_logs" ? logsQuery : recipientsQuery));
    getSupabase.mockReturnValue({ from });
    const adapter = createLegacySubscribersBroadcastAdapter();

    await expect(adapter.listLogs()).resolves.toEqual({ data: [{ id: "log-1" }], error: null });
    await expect(
      adapter.listRecipients({ tags: ["vip"], channel: "support", text: "公告", style: "text", title: "標題", accentColor: "#06C755" }),
    ).resolves.toEqual({ data: [{ id: "s1", line_user_id: "U1", channel: "support" }], error: null });
    expect(logsQuery.select).toHaveBeenCalledWith("*");
    expect(logsQuery.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(logsQuery.limit).toHaveBeenCalledWith(30);
    expect(recipientsQuery.select).toHaveBeenCalledWith("id, line_user_id, channel");
    expect(recipientsQuery.overlaps).toHaveBeenCalledWith("tags", ["vip"]);
    expect(recipientsQuery.eq).toHaveBeenCalledWith("channel", "support");
  });

  it("keeps LINE message construction and broadcast log writes", async () => {
    const activityQuery = { insert: vi.fn().mockResolvedValue({ error: null }) };
    getSupabase.mockReturnValue({ from: vi.fn(() => activityQuery) });
    buildPushMessages.mockReturnValue([{ type: "text", text: "公告" }]);
    pushLineRawMessages.mockResolvedValue(undefined);
    const adapter = createLegacySubscribersBroadcastAdapter();
    const request = { tags: [], channel: "all" as const, text: "公告", style: "buttons" as const, title: "標題", accentColor: "#F59E0B" };

    await adapter.send({ id: "s1", line_user_id: "U1", channel: "support" }, request);
    await adapter.recordLog({ tag_filter: null, channel_filter: null, message_style: "buttons", message_text: "公告", recipient_count: 1, success_count: 1, failed_count: 0 });

    expect(buildPushMessages).toHaveBeenCalledWith({ style: "buttons", text: "公告", title: "標題", accentColor: "#F59E0B" });
    expect(pushLineRawMessages).toHaveBeenCalledWith("U1", [{ type: "text", text: "公告" }], "support");
    expect(activityQuery.insert).toHaveBeenCalledWith({ tag_filter: null, channel_filter: null, message_style: "buttons", message_text: "公告", recipient_count: 1, success_count: 1, failed_count: 0 });
  });
});
