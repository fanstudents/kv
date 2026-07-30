import { describe, expect, it } from "vitest";
import {
  classifyVisitApprovalText,
  classifyVisitDecisionText,
  normalizeVisitLineInbound,
} from "@/modules/visit/line-inbound";

const base = {
  source: { userId: "line-user-1" },
  replyToken: "reply-1",
};

describe("Visit LINE inbound normalizer", () => {
  it("normalizes image and text messages without provider types", () => {
    expect(
      normalizeVisitLineInbound({
        ...base,
        type: "message",
        message: { type: "image", id: "message-1" },
      })
    ).toEqual({
      kind: "image",
      userId: "line-user-1",
      replyToken: "reply-1",
      messageId: "message-1",
    });
    expect(
      normalizeVisitLineInbound({
        ...base,
        type: "message",
        message: { type: "text", text: "確認" },
      })
    ).toEqual({
      kind: "text",
      userId: "line-user-1",
      replyToken: "reply-1",
      text: "確認",
    });
  });

  it.each([
    ["action=confirm", { action: "confirm" }],
    ["action=cancel", { action: "cancel" }],
    ["action=tag_done", { action: "tag_done" }],
    [
      "action=tag&contact=contact-1&value=%E5%BE%85%E8%B7%9F%E9%80%B2",
      { action: "tag", contactId: "contact-1", value: "待跟進" },
    ],
    ["action=tag&contact=contact-1", { action: "unknown", rawAction: "tag" }],
    ["action=future", { action: "unknown", rawAction: "future" }],
  ] as const)("parses postback %s", (data, postback) => {
    expect(
      normalizeVisitLineInbound({
        ...base,
        type: "postback",
        postback: { data },
      })
    ).toEqual({
      kind: "postback",
      userId: "line-user-1",
      replyToken: "reply-1",
      postback,
    });
  });

  it.each([
    [{ type: "message" }, "missing-user"],
    [{ type: "message", source: { userId: "line-user-1" } }, "missing-reply-token"],
    [
      {
        ...base,
        type: "message",
        message: { type: "image" },
      },
      "missing-message-id",
    ],
    [
      {
        ...base,
        type: "message",
        message: { type: "video" },
      },
      "unsupported-message",
    ],
    [{ ...base, type: "follow" }, "unsupported-event"],
  ] as const)("classifies ignored input as %s", (event, reason) => {
    expect(normalizeVisitLineInbound(event)).toEqual({ kind: "ignored", reason });
  });
});

describe("Visit LINE text classification", () => {
  it("checks cancellation before confirmation because 不要 contains 要", () => {
    expect(classifyVisitDecisionText("先不要")).toEqual({ type: "cancel" });
    expect(classifyVisitDecisionText("不要安排")).toEqual({ type: "cancel" });
    expect(classifyVisitDecisionText("要，請安排")).toEqual({ type: "confirm" });
    expect(classifyVisitDecisionText("OK")).toEqual({ type: "confirm" });
    expect(classifyVisitDecisionText("再看看")).toEqual({ type: "other" });
  });

  it("checks cancellation before send and treats other approval text as revision", () => {
    expect(classifyVisitApprovalText("取消，不要寄")).toEqual({ type: "cancel" });
    expect(classifyVisitApprovalText("可以寄出")).toEqual({ type: "send" });
    expect(classifyVisitApprovalText("SEND")).toEqual({ type: "send" });
    expect(classifyVisitApprovalText("語氣再自然一點")).toEqual({
      type: "revise",
      instruction: "語氣再自然一點",
    });
  });
});
