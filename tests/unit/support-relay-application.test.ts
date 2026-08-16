import { describe, expect, it } from "vitest";
import {
  deriveSupportRelayDeliveryKey,
  parseSupportRelayPayload,
  processSupportRelay,
} from "@/modules/support/relay";
import type {
  SupportRelayActivity,
  SupportRelayForwardRequest,
  SupportRelayPorts,
} from "@/modules/support/relay";

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

const deliveryKey = deriveSupportRelayDeliveryKey(request.rawBody);

describe("Amber LINE legacy relay application", () => {
  it("derives the same delivery key for an exact webhook replay", () => {
    expect(deriveSupportRelayDeliveryKey(request.rawBody)).toBe(deliveryKey);
    expect(deriveSupportRelayDeliveryKey(request.rawBody)).toBe(
      deriveSupportRelayDeliveryKey(request.rawBody)
    );
    expect(deriveSupportRelayDeliveryKey(request.rawBody + " ")).not.toBe(deliveryKey);
  });

  it("keeps only object events and rejects a malformed event collection", () => {
    expect(parseSupportRelayPayload('{"events":[{"type":"message"},null,42]}')).toEqual({
      type: "parsed",
      events: [{ type: "message" }],
    });
    expect(parseSupportRelayPayload("{}")).toEqual({ type: "parsed", events: [] });
    expect(parseSupportRelayPayload('{"events":{}}')).toEqual({ type: "invalid" });
  });

  it("forwards the exact transport values and skips non-text events", async () => {
    const fixture = createPorts();

    await expect(
      processSupportRelay({
        ...request,
        events: [{ type: "follow" }],
        ports: fixture.ports,
      })
    ).resolves.toEqual({
      capturedConversations: 0,
      issues: [],
      forward: { deliveryKey, status: "forwarded" },
    });
    expect(fixture.forwards).toEqual([{ ...request, deliveryKey }]);
    expect(fixture.activities).toEqual([]);
    expect(fixture.touches).toEqual([]);
    expect(fixture.conversations).toEqual([]);
  });

  it("touches, records activity, and captures the full customer text", async () => {
    const fixture = createPorts();

    const result = await processSupportRelay({
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
          "收到客戶 U123 的訊息：「請問訂單進度」（KV 只記錄、不回覆；轉送狀態另見活動紀錄）",
        status: "success",
      },
    ]);
    expect(fixture.conversations).toEqual([
      { userId: "U123", text: "請問訂單進度" },
    ]);
    expect(result).toEqual({
      capturedConversations: 1,
      issues: [],
      forward: { deliveryKey, status: "forwarded" },
    });
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
    ).resolves.toMatchObject({
      capturedConversations: 1,
      issues: [{ operation: "forward", message: "legacy unavailable" }],
      forward: { deliveryKey, status: "not_confirmed", failureKind: "unknown" },
    });
    expect(fixture.activities).toContainEqual({
      summary:
        `轉發給下游客服／助理系統未確認成功：legacy unavailable（delivery key: ${deliveryKey}；未具備安全重播契約，本次不自動重送，請由下游系統 owner 依 key 確認）`,
      status: "failed",
    });
    expect(fixture.conversations).toEqual([
      { userId: "U123", text: "需要協助" },
    ]);
  });

  it("preserves the non-Error relay fallback", async () => {
    const fixture = createPorts({ forwardError: "offline" });

    const result = await processSupportRelay({ ...request, events: [], ports: fixture.ports });

    expect(fixture.activities).toEqual([
      {
        summary:
        `轉發給下游客服／助理系統未確認成功：轉發失敗（delivery key: ${deliveryKey}；未具備安全重播契約，本次不自動重送，請由下游系統 owner 依 key 確認）`,
        status: "failed",
      },
    ]);
    expect(result).toEqual({
      capturedConversations: 0,
      issues: [{ operation: "forward", message: "轉發失敗" }],
      forward: { deliveryKey, status: "not_confirmed", failureKind: "unknown" },
    });
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
    ).resolves.toEqual({
      capturedConversations: 0,
      issues: [
        { operation: "subscriber", message: "profile unavailable", userId: "U123" },
        { operation: "activity", message: "activity unavailable", userId: "U123" },
        { operation: "conversation", message: "conversation unavailable", userId: "U123" },
      ],
      forward: { deliveryKey, status: "forwarded" },
    });
    expect(fixture.touches).toEqual(["U123"]);
    expect(fixture.activities).toHaveLength(1);
    expect(fixture.conversations).toHaveLength(1);
  });
});
