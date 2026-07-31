import { describe, expect, it, vi } from "vitest";
import { runAgentInstanceUpdate } from "@/modules/agents/agent-instance-update-application";
import type { AgentInstanceUpdatePort } from "@/modules/agents/agent-instance-update-ports";

describe("agent instance update application", () => {
  it("updates the row and records the existing enabled/settings activities in order", async () => {
    const port: AgentInstanceUpdatePort = {
      updateBySlug: vi.fn().mockResolvedValue({ data: { slug: "operations", enabled: true }, errorMessage: null }),
      recordActivity: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      runAgentInstanceUpdate("operations", { enabled: true, settings: { tone: "brief" } }, port, "now")
    ).resolves.toEqual({ kind: "updated", data: { slug: "operations", enabled: true } });
    expect(port.updateBySlug).toHaveBeenCalledWith("operations", {
      updated_at: "now",
      enabled: true,
      settings: { tone: "brief" },
    });
    expect(port.recordActivity).toHaveBeenNthCalledWith(1, {
      agent_slug: "operations",
      summary: "Agent 已啟用",
      status: "success",
    });
    expect(port.recordActivity).toHaveBeenNthCalledWith(2, {
      agent_slug: "operations",
      summary: "已更新 Agent 設定",
      status: "success",
    });
  });

  it("records the provider failure before returning the existing error result", async () => {
    const port: AgentInstanceUpdatePort = {
      updateBySlug: vi.fn().mockResolvedValue({ data: null, errorMessage: "permission denied" }),
      recordActivity: vi.fn().mockResolvedValue(undefined),
    };

    await expect(runAgentInstanceUpdate("operations", {}, port, "now")).resolves.toEqual({
      kind: "error",
      message: "permission denied",
    });
    expect(port.recordActivity).toHaveBeenCalledWith({
      agent_slug: "operations",
      summary: "更新設定失敗：permission denied",
      status: "failed",
    });
  });
});
