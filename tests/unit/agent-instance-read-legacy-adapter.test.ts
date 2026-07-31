import { describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyAgentInstanceReadAdapter } from "@/adapters/agents/legacy-agent-instance-read-adapter";

describe("legacy agent instance read adapter", () => {
  it("keeps the line_agents select-by-slug query and error mapping", async () => {
    const response = Promise.resolve({
      data: { slug: "operations", enabled: true },
      error: null,
    });
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(() => response),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const from = vi.fn(() => query);
    getSupabase.mockReturnValue({ from });

    await expect(createLegacyAgentInstanceReadAdapter().getBySlug("operations")).resolves.toEqual({
      data: { slug: "operations", enabled: true },
      errorMessage: null,
    });
    expect(from).toHaveBeenCalledWith("line_agents");
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.eq).toHaveBeenCalledWith("slug", "operations");
    expect(query.single).toHaveBeenCalledOnce();
  });

  it("keeps provider error messages available to the route", async () => {
    const response = Promise.resolve({ data: null, error: { message: "not found" } });
    const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn(() => response) };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    getSupabase.mockReturnValue({ from: vi.fn(() => query) });

    await expect(createLegacyAgentInstanceReadAdapter().getBySlug("missing")).resolves.toEqual({
      data: null,
      errorMessage: "not found",
    });
  });
});
