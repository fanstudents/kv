import { describe, expect, it } from "vitest";
import { parseAgentTestPushRequest } from "@/modules/agents/test-push-rules";

describe("agent test-push rules", () => {
  it("trims the recipient, keeps support channel routing, and preserves style metadata", () => {
    expect(
      parseAgentTestPushRequest("support", {
        to: "  U123  ",
        text: "hello",
        style: "buttons",
        title: "Title",
        accentColor: "#abcdef",
      })
    ).toEqual({
      kind: "valid",
      input: {
        slug: "support",
        to: "U123",
        text: "hello",
        style: "buttons",
        styleLabel: "按鈕選單",
        title: "Title",
        accentColor: "#abcdef",
        channel: "support",
      },
    });
  });

  it("preserves defaults and falls back to the primary channel", () => {
    expect(parseAgentTestPushRequest("operations", { to: "U1", text: "hello", style: "unknown" })).toMatchObject({
      kind: "valid",
      input: {
        style: "text",
        styleLabel: "純文字",
        title: "通知",
        accentColor: "#06C755",
        channel: "primary",
      },
    });
  });

  it("keeps the existing validation messages", () => {
    expect(parseAgentTestPushRequest("operations", { text: "hello" })).toEqual({
      kind: "invalid",
      message: "缺少測試對象 LINE User ID",
    });
    expect(parseAgentTestPushRequest("operations", { to: "U1" })).toEqual({
      kind: "invalid",
      message: "缺少要推播的訊息內容",
    });
  });
});
