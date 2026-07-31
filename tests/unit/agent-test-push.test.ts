import { describe, expect, it, vi } from "vitest";
import {
  parseAgentTestPushRequest,
  runAgentTestPush,
  type AgentTestPushInput,
  type AgentTestPushPort,
} from "@/modules/agents/test-push";

const input: AgentTestPushInput = {
  slug: "support",
  to: "U1",
  text: "hello",
  style: "confirm",
  styleLabel: "確認按鈕",
  title: "通知",
  accentColor: "#06C755",
  channel: "support",
};

describe("agent test-push compatibility", () => {
  it("keeps recipient/style/channel parsing and validation", () => {
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
    expect(parseAgentTestPushRequest("operations", { to: "U1", text: "hello", style: "unknown" })).toMatchObject({
      kind: "valid",
      input: { style: "text", styleLabel: "純文字", title: "通知", accentColor: "#06C755", channel: "primary" },
    });
    expect(parseAgentTestPushRequest("operations", { text: "hello" })).toEqual({
      kind: "invalid",
      message: "缺少測試對象 LINE User ID",
    });
  });

  it("keeps LINE delivery payload and activity success/failure behavior", async () => {
    const success: AgentTestPushPort = {
      send: vi.fn(async () => undefined),
      recordFailure: vi.fn(async () => undefined),
      recordSuccess: vi.fn(async () => ({ id: "activity-1" })),
    };
    await expect(runAgentTestPush(input, success)).resolves.toEqual({ kind: "success", ok: true, activity: { id: "activity-1" } });
    expect(success.send).toHaveBeenCalledWith({
      to: "U1",
      text: "hello",
      style: "confirm",
      title: "通知",
      accentColor: "#06C755",
      channel: "support",
    });

    const failure: AgentTestPushPort = {
      send: vi.fn(async () => { throw new Error("LINE down"); }),
      recordFailure: vi.fn(async () => undefined),
      recordSuccess: vi.fn(),
    };
    await expect(runAgentTestPush(input, failure)).resolves.toEqual({ kind: "error", message: "LINE down" });
    expect(failure.recordFailure).toHaveBeenCalledWith({
      agent_slug: "support",
      summary: "測試推播失敗（確認按鈕）：LINE down",
      status: "failed",
    });
  });
});
