import { describe, expect, it } from "vitest";
import { processSupportRelay } from "@/modules/support/relay-application";
import type {
  SupportRelayActivity,
  SupportRelayForwardRequest,
  SupportRelayPorts,
} from "@/modules/support/relay-ports";

function createPorts(options?: {
  forwardError?: unknown;
  touchError?: unknown;
  activityError?: unknown;
  conversationError?: unknown;
}) {
  const forwards: SupportRelayForwardRequest[] = [];
  const activities: SupportRelayActivity[] = [];
  const touches: string[] = [];
  const conversations: Array<{ userId: string; text: string }> = [];
  const ports: SupportRelayPorts = {
    relay: {
      async forward(request) {
        forwards.push(request);
        if (options?.forwardError !== undefined) throw options.forwardError;
      },
    },
    repository: {
      async recordActivity(activity) {
        activities.push(activity);
        if (options?.activityError !== undefined) throw options.activityError;
      },
    },
    subscribers: {
      async touch(userId) {
        touches.push(userId);
        if (options?.touchError !== undefined) throw options.touchError;
      },
    },
    conversations: {
      async recordCustomerMessage(userId, text) {
        conversations.push({ userId, text });
        if (options?.conversationError !== undefined) {
          throw options.conversationError;
        }
      },
    },
  };
  return { ports, forwards, activities, touches, conversations };
}

const request = {
  rawBody: '{"events":[]}',
  signature: "signature",
  contentType: "application/json; charset=utf-8",
};

describe("Amber LINE legacy relay application", () => {
  it("forwards the exact transport values and skips non-text events", async () => {
    const fixture = createPorts();

    await expect(
      processSupportRelay({
        ...request,
        events: [{ type: "follow" }],
        ports: fixture.ports,
      })
    ).resolves.toBeUndefined();
    expect(fixture.forwards).toEqual([request]);
    expect(fixture.activities).toEqual([]);
    expect(fixture.touches).toEqual([]);
    expect(fixture.conversations).toEqual([]);
  });

  it("touches, records activity, and captures the full customer text", async () => {
    const fixture = createPorts();

    await processSupportRelay({
      ...request,
      events: [
        {
          type: "message",
          source: { userId: "U123" },
          message: { type: "text", text: "請問訂單進度" },
        },
      ],
      ports: fixture.ports,
    });

    expect(fixture.touches).toEqual(["U123"]);
    expect(fixture.activities).toEqual([
      {
        summary:
          "收到客戶 U123 的訊息：「請問訂單進度」（已轉發給既有客服系統處理，這裡只記錄）",
        status: "success",
      },
    ]);
    expect(fixture.conversations).toEqual([
      { userId: "U123", text: "請問訂單進度" },
    ]);
  });

  it("records relay failure while still capturing customer messages", async () => {
    const fixture = createPorts({
      forwardError: new Error("legacy unavailable"),
    });

    await expect(
      processSupportRelay({
        ...request,
        events: [
          {
            type: "message",
            source: { userId: "U123" },
            message: { type: "text", text: "需要協助" },
          },
        ],
        ports: fixture.ports,
      })
    ).resolves.toBeUndefined();
    expect(fixture.activities).toContainEqual({
      summary:
        "轉發給舊客服系統失敗：legacy unavailable（客戶仍會由舊系統處理，只是這筆沒轉發成功）",
      status: "failed",
    });
    expect(fixture.conversations).toEqual([
      { userId: "U123", text: "需要協助" },
    ]);
  });

  it("preserves the non-Error relay fallback", async () => {
    const fixture = createPorts({ forwardError: "offline" });

    await processSupportRelay({ ...request, events: [], ports: fixture.ports });

    expect(fixture.activities).toEqual([
      {
        summary:
          "轉發給舊客服系統失敗：轉發失敗（客戶仍會由舊系統處理，只是這筆沒轉發成功）",
        status: "failed",
      },
    ]);
  });

  it("isolates subscriber, activity, and conversation failures from the ACK path", async () => {
    const fixture = createPorts({
      touchError: new Error("profile unavailable"),
      activityError: new Error("activity unavailable"),
      conversationError: new Error("conversation unavailable"),
    });

    await expect(
      processSupportRelay({
        ...request,
        events: [
          {
            type: "message",
            source: { userId: "U123" },
            message: { type: "text", text: "需要協助" },
          },
        ],
        ports: fixture.ports,
      })
    ).resolves.toBeUndefined();
    expect(fixture.touches).toEqual(["U123"]);
    expect(fixture.activities).toHaveLength(1);
    expect(fixture.conversations).toHaveLength(1);
  });
});
