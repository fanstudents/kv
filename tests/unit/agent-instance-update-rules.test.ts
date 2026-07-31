import { describe, expect, it } from "vitest";
import { parseAgentInstanceUpdateRequest } from "@/modules/agents/agent-instance-update-rules";

describe("agent instance update rules", () => {
  it("keeps only boolean enabled and object settings with updated_at", () => {
    expect(parseAgentInstanceUpdateRequest("operations", { enabled: false, settings: { tone: "brief" } }, "2026-07-31T00:00:00.000Z")).toEqual({
      slug: "operations",
      update: { updated_at: "2026-07-31T00:00:00.000Z", enabled: false, settings: { tone: "brief" } },
      enabledChanged: true,
      settingsChanged: true,
    });
  });

  it("preserves the timestamp-only update when fields are absent or invalid", () => {
    expect(parseAgentInstanceUpdateRequest("operations", { enabled: "false", settings: null }, "now")).toEqual({
      slug: "operations",
      update: { updated_at: "now" },
      enabledChanged: false,
      settingsChanged: false,
    });
  });
});
