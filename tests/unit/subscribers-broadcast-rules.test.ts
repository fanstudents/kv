import { describe, expect, it } from "vitest";
import { parseSubscribersBroadcastRequest } from "@/modules/subscribers/broadcast-rules";

describe("parseSubscribersBroadcastRequest", () => {
  it("keeps text validation and existing defaults", () => {
    expect(parseSubscribersBroadcastRequest({ text: "  " })).toEqual({
      kind: "invalid",
      message: "缺少要推播的訊息內容",
    });
    expect(parseSubscribersBroadcastRequest({ text: " hello " })).toEqual({
      kind: "ok",
      input: {
        tags: [],
        channel: "all",
        text: "hello",
        style: "text",
        title: "團隊公告",
        accentColor: "#06C755",
      },
    });
  });

  it("keeps tag filtering, channel selection, styles, and color validation", () => {
    expect(
      parseSubscribersBroadcastRequest({
        tags: ["vip", 3, ""],
        channel: "support",
        text: "公告",
        style: "buttons",
        title: "重要通知",
        accentColor: "#F59E0B",
      }),
    ).toEqual({
      kind: "ok",
      input: {
        tags: ["vip", ""],
        channel: "support",
        text: "公告",
        style: "buttons",
        title: "重要通知",
        accentColor: "#F59E0B",
      },
    });
  });

  it("falls back to the text style, all channel, title, and green accent", () => {
    expect(parseSubscribersBroadcastRequest({ channel: "other", text: "公告", style: "unknown", accentColor: "red" })).toMatchObject({
      kind: "ok",
      input: { channel: "all", style: "text", title: "團隊公告", accentColor: "#06C755" },
    });
  });
});
