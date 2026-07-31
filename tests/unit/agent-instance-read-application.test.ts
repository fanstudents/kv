import { describe, expect, it, vi } from "vitest";
import { runAgentInstanceRead } from "@/modules/agents/agent-instance-read-application";
import type { AgentInstanceReadPort } from "@/modules/agents/agent-instance-read-ports";

describe("agent instance read application", () => {
  it("returns the existing line_agents row unchanged", async () => {
    const row = { slug: "operations", enabled: true, settings: { tone: "brief" } };
    const port: AgentInstanceReadPort = { getBySlug: vi.fn().mockResolvedValue({ data: row, errorMessage: null }) };

    await expect(runAgentInstanceRead("operations", port)).resolves.toEqual({ kind: "found", data: row });
    expect(port.getBySlug).toHaveBeenCalledWith("operations");
  });

  it("preserves provider error text and not-found fallback", async () => {
    const errorPort: AgentInstanceReadPort = {
      getBySlug: vi.fn().mockResolvedValue({ data: null, errorMessage: "row missing" }),
    };
    await expect(runAgentInstanceRead("missing", errorPort)).resolves.toEqual({
      kind: "not-found",
      message: "row missing",
    });

    const emptyPort: AgentInstanceReadPort = { getBySlug: vi.fn().mockResolvedValue({ data: null, errorMessage: null }) };
    await expect(runAgentInstanceRead("missing", emptyPort)).resolves.toEqual({
      kind: "not-found",
      message: "not found",
    });
  });
});
