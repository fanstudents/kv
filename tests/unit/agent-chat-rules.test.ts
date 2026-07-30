import { describe, expect, it } from "vitest";
import {
  parseAgentChatRequest,
  withAgentChatReplyFallback,
} from "@/modules/agent-chat/rules";

describe("Agent chat deterministic rules", () => {
  it("preserves the slug and history while trimming the message", () => {
    expect(
      parseAgentChatRequest({
        agentSlug: "report",
        message: "  看報表  ",
        history: "之前",
        ignored: true,
      })
    ).toEqual({
      agentSlug: "report",
      message: "看報表",
      history: "之前",
    });
  });

  it("keeps the existing untrimmed slug behavior", () => {
    expect(
      parseAgentChatRequest({
        agentSlug: " report ",
        message: "hello",
      })
    ).toEqual({
      agentSlug: " report ",
      message: "hello",
      history: "",
    });
  });

  it.each([
    null,
    {},
    { agentSlug: "", message: "hello" },
    { agentSlug: "report", message: "" },
    { agentSlug: "report", message: "   " },
    { agentSlug: 1, message: "hello" },
    { agentSlug: "report", message: 1 },
  ])("rejects the existing invalid request shape %#", (payload) => {
    expect(parseAgentChatRequest(payload)).toBeNull();
  });

  it("coerces non-string history to the empty string", () => {
    expect(
      parseAgentChatRequest({
        agentSlug: "report",
        message: "hello",
        history: ["old"],
      })
    ).toEqual({
      agentSlug: "report",
      message: "hello",
      history: "",
    });
  });

  it("preserves text and applies the exact fallback only when empty", () => {
    expect(withAgentChatReplyFallback("完成")).toBe("完成");
    expect(withAgentChatReplyFallback("")).toBe("收到，我確認後回覆您。");
  });
});
