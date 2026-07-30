import { describe, expect, it } from "vitest";
import {
  parseSupportRelayPayload,
  planSupportRelayCapture,
} from "@/modules/support/relay-inbound";

describe("Amber LINE relay inbound rules", () => {
  it("preserves malformed and missing-events payload behavior", () => {
    expect(parseSupportRelayPayload("{")).toEqual({ type: "invalid" });
    expect(parseSupportRelayPayload("{}")).toEqual({
      type: "parsed",
      events: [],
    });
    expect(parseSupportRelayPayload("null")).toEqual({ type: "invalid" });
  });

  it("returns the decoded events value without transport normalization", () => {
    const events = [{ type: "follow" }];
    expect(parseSupportRelayPayload(JSON.stringify({ events }))).toEqual({
      type: "parsed",
      events,
    });
  });

  it("skips non-message and non-text events", () => {
    expect(planSupportRelayCapture({ type: "follow" })).toEqual({ type: "skip" });
    expect(
      planSupportRelayCapture({
        type: "message",
        message: { type: "image" },
      })
    ).toEqual({ type: "skip" });
  });

  it("preserves user, text, role, and exact activity copy", () => {
    expect(
      planSupportRelayCapture({
        type: "message",
        source: { userId: "U123" },
        message: { type: "text", text: "請問訂單進度" },
      })
    ).toEqual({
      type: "capture",
      userId: "U123",
      sourceUserId: "U123",
      text: "請問訂單進度",
      conversationRole: "customer",
      activitySummary:
        "收到客戶 U123 的訊息：「請問訂單進度」（已轉發給既有客服系統處理，這裡只記錄）",
    });
  });

  it("preserves missing user and text fallbacks", () => {
    expect(
      planSupportRelayCapture({
        type: "message",
        message: { type: "text" },
      })
    ).toMatchObject({
      type: "capture",
      userId: "未知使用者",
      sourceUserId: null,
      text: "",
      conversationRole: "customer",
    });
  });

  it("keeps only the first 60 characters in activity copy", () => {
    const text = "字".repeat(65);
    const plan = planSupportRelayCapture({
      type: "message",
      source: { userId: "U123" },
      message: { type: "text", text },
    });

    expect(plan).toMatchObject({ type: "capture", text });
    if (plan.type === "capture") {
      expect(plan.activitySummary).toContain(`「${"字".repeat(60)}」`);
      expect(plan.activitySummary).not.toContain("字".repeat(61));
    }
  });
});
