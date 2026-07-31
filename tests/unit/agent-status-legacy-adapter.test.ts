import { describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyAgentStatusReadAdapter } from "@/adapters/agents/legacy-status-read-adapter";

describe("createLegacyAgentStatusReadAdapter", () => {
  it("keeps the legacy line_agents status projection", async () => {
    const response = Promise.resolve({
      data: [{ slug: "active", enabled: true }],
      error: null,
    });
    const query = {
      select: vi.fn(),
      then: response.then.bind(response),
    };
    query.select.mockReturnValue(query);
    const from = vi.fn(() => query);
    getSupabase.mockReturnValue({ from });

    await expect(createLegacyAgentStatusReadAdapter().list()).resolves.toEqual({
      data: [{ slug: "active", enabled: true }],
      error: null,
    });
    expect(getSupabase).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("line_agents");
    expect(query.select).toHaveBeenCalledWith("slug,enabled");
  });
});
