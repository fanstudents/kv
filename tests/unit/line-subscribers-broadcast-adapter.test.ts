import { describe, expect, it, vi } from "vitest";

const { buildPushMessages, pushLineRawMessages, getMainSupabase } = vi.hoisted(() => ({
  buildPushMessages: vi.fn(),
  pushLineRawMessages: vi.fn(),
  getMainSupabase: vi.fn(),
}));

vi.mock("@/lib/line", () => ({ pushLineRawMessages }));
vi.mock("@/lib/line-message-styles", () => ({ buildPushMessages }));
vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createLineSubscribersBroadcastAdapter } from "@/adapters/subscribers/line-broadcast-adapter";

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

describe("LINE Subscribers broadcast adapter", () => {
  it("keeps the log query and recipient filters", async () => {
    const logsQuery = chain({ data: [{ id: "log-1" }], error: null });
    const recipientsQuery = chain({ data: [{ id: "s1", line_user_id: "U1", channel: "support" }], error: null });
    const from = vi.fn((table: string) => (table === "broadcast_logs" ? logsQuery : recipientsQuery));
    getMainSupabase.mockReturnValue({ from });
    const adapter = createLineSubscribersBroadcastAdapter();

    await expect(adapter.listLogs()).resolves.toEqual({ data: [{ id: "log-1" }], error: null });
    await expect(adapter.listRecipients({
      tags: ["vip"],
      channel: "support",
      text: "公告",
      style: "text",
      title: "標題",
      accentColor: "#06C755",
    })).resolves.toEqual({ data: [{ id: "s1", line_user_id: "U1", channel: "support" }], error: null });
    expect(logsQuery.select).toHaveBeenCalledWith("*");
    expect(logsQuery.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(logsQuery.limit).toHaveBeenCalledWith(30);
    expect(recipientsQuery.select).toHaveBeenCalledWith("id, line_user_id, channel");
    expect(recipientsQuery.overlaps).toHaveBeenCalledWith("tags", ["vip"]);
    expect(recipientsQuery.eq).toHaveBeenCalledWith("channel", "support");
  });

  it("keeps LINE message construction and log writes", async () => {
    const query = { insert: vi.fn().mockResolvedValue({ error: null }) };
    getMainSupabase.mockReturnValue({ from: vi.fn(() => query) });
    buildPushMessages.mockReturnValue([{ type: "text", text: "公告" }]);
    pushLineRawMessages.mockResolvedValue(undefined);
    const adapter = createLineSubscribersBroadcastAdapter();
    const request = {
      tags: [],
      channel: "all" as const,
      text: "公告",
      style: "buttons" as const,
      title: "標題",
      accentColor: "#F59E0B",
    };

    await adapter.send({ id: "s1", line_user_id: "U1", channel: "support" }, request);
    await adapter.recordLog({
      tag_filter: null,
      channel_filter: null,
      message_style: "buttons",
      message_text: "公告",
      recipient_count: 1,
      success_count: 1,
      failed_count: 0,
    });
    expect(buildPushMessages).toHaveBeenCalledWith({
      style: "buttons",
      text: "公告",
      title: "標題",
      accentColor: "#F59E0B",
    });
    expect(pushLineRawMessages).toHaveBeenCalledWith("U1", [{ type: "text", text: "公告" }], "support");
    expect(query.insert).toHaveBeenCalledOnce();
  });
});
