import { describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyAgentInstanceUpdateAdapter } from "@/adapters/agents/legacy-agent-instance-update-adapter";

describe("legacy agent instance update adapter", () => {
  it("keeps the line_agents update query and line_agent_activity insert", async () => {
    const updateResponse = Promise.resolve({ data: { slug: "operations", enabled: false }, error: null });
    const updateQuery = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn(() => updateResponse),
    };
    updateQuery.update.mockReturnValue(updateQuery);
    updateQuery.eq.mockReturnValue(updateQuery);
    updateQuery.select.mockReturnValue(updateQuery);
    const activityQuery = { insert: vi.fn().mockResolvedValue({ error: null }) };
    const from = vi.fn((table: string) => (table === "line_agents" ? updateQuery : activityQuery));
    getSupabase.mockReturnValue({ from });
    const adapter = createLegacyAgentInstanceUpdateAdapter();

    await expect(adapter.updateBySlug("operations", { updated_at: "now", enabled: false })).resolves.toEqual({
      data: { slug: "operations", enabled: false },
      errorMessage: null,
    });
    await adapter.recordActivity({ agent_slug: "operations", summary: "Agent 已停用", status: "success" });

    expect(updateQuery.update).toHaveBeenCalledWith({ updated_at: "now", enabled: false });
    expect(updateQuery.eq).toHaveBeenCalledWith("slug", "operations");
    expect(updateQuery.select).toHaveBeenCalledWith();
    expect(activityQuery.insert).toHaveBeenCalledWith({
      agent_slug: "operations",
      summary: "Agent 已停用",
      status: "success",
    });
  });
});
