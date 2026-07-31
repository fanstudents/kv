import { describe, expect, it, vi } from "vitest";
import { runAgentTestPush } from "@/modules/agents/test-push-application";
import type { AgentTestPushPort } from "@/modules/agents/test-push-ports";
import type { AgentTestPushInput } from "@/modules/agents/test-push-rules";

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

describe("agent test-push application", () => {
  it("sends through the port and records the success activity", async () => {
    const port: AgentTestPushPort = {
      send: vi.fn().mockResolvedValue(undefined),
      recordFailure: vi.fn(),
      recordSuccess: vi.fn().mockResolvedValue({ id: "activity-1" }),
    };

    await expect(runAgentTestPush(input, port)).resolves.toEqual({ kind: "success", ok: true, activity: { id: "activity-1" } });
    expect(port.send).toHaveBeenCalledWith({
      to: "U1",
      text: "hello",
      style: "confirm",
      title: "通知",
      accentColor: "#06C755",
      channel: "support",
    });
    expect(port.recordSuccess).toHaveBeenCalledWith({
      agent_slug: "support",
      summary: "已透過 LINE Messaging API 送出測試推播（確認按鈕樣式）",
      status: "success",
    });
  });

  it("records provider failures and maps them to an error result", async () => {
    const port: AgentTestPushPort = {
      send: vi.fn().mockRejectedValue(new Error("LINE down")),
      recordFailure: vi.fn().mockResolvedValue(undefined),
      recordSuccess: vi.fn(),
    };

    await expect(runAgentTestPush(input, port)).resolves.toEqual({ kind: "error", message: "LINE down" });
    expect(port.recordFailure).toHaveBeenCalledWith({
      agent_slug: "support",
      summary: "測試推播失敗（確認按鈕）：LINE down",
      status: "failed",
    });
  });
});
