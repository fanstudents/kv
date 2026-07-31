import { describe, expect, it } from "vitest";
import {
  dispatchVisitLineWebhookEvents,
  type VisitLineWebhookDispatchHandlers,
} from "@/modules/visit/line-inbound";

function createHandlers(overrides?: Partial<VisitLineWebhookDispatchHandlers>) {
  const calls: string[] = [];
  const handlers: VisitLineWebhookDispatchHandlers = {
    async touchSubscriber(userId) {
      calls.push(`touch:${userId}`);
    },
    async handleImageMessage(_event, userId) {
      calls.push(`image:${userId}`);
    },
    async handleTextMessage(_event, userId, baseUrl) {
      calls.push(`text:${userId}:${baseUrl}`);
    },
    async handlePostback(_event, userId, baseUrl) {
      calls.push(`postback:${userId}:${baseUrl}`);
    },
    ...overrides,
  };
  return { handlers, calls };
}

describe("Visit LINE webhook application", () => {
  it("preserves subscriber touch and normalized handler routing", async () => {
    const { handlers, calls } = createHandlers();

    await dispatchVisitLineWebhookEvents({
      events: [
        { type: "message", replyToken: "image-token", source: { userId: "u-image" }, message: { type: "image", id: "m-1" } },
        { type: "message", replyToken: "text-token", source: { userId: "u-text" }, message: { type: "text", text: "hello" } },
        { type: "postback", replyToken: "postback-token", source: { userId: "u-postback" }, postback: { data: "action=confirm" } },
      ],
      baseUrl: "https://kv.example.test",
      fallbackUserId: "unknown-user",
      handlers,
    });

    expect(calls).toEqual([
      "touch:u-image",
      "touch:u-text",
      "touch:u-postback",
      "image:u-image",
      "text:u-text:https://kv.example.test",
      "postback:u-postback:https://kv.example.test",
    ]);
  });

  it("skips events without reply tokens and preserves the fallback user id", async () => {
    const { handlers, calls } = createHandlers();

    await dispatchVisitLineWebhookEvents({
      events: [
        { type: "message", source: { userId: "ignored" }, message: { type: "text", text: "ignored" } },
        { type: "message", replyToken: "fallback-token", message: { type: "text", text: "hello" } },
      ],
      baseUrl: "https://kv.example.test",
      fallbackUserId: "unknown-user",
      handlers,
    });

    expect(calls).toEqual(["text:unknown-user:https://kv.example.test"]);
  });

  it("keeps Promise.allSettled failure isolation between events", async () => {
    const { handlers, calls } = createHandlers({
      handleTextMessage: async () => {
        calls.push("text-failed");
        throw new Error("handler failed");
      },
    });

    await expect(
      dispatchVisitLineWebhookEvents({
        events: [
          { type: "message", replyToken: "text-token", source: { userId: "u-text" }, message: { type: "text", text: "hello" } },
          { type: "message", replyToken: "image-token", source: { userId: "u-image" }, message: { type: "image", id: "m-1" } },
        ],
        baseUrl: "https://kv.example.test",
        fallbackUserId: "unknown-user",
        handlers,
      })
    ).resolves.toBeUndefined();

    expect(calls).toEqual(["touch:u-text", "touch:u-image", "text-failed", "image:u-image"]);
  });
});
