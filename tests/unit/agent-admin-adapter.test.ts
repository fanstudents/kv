import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase } = vi.hoisted(() => ({ getMainSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createSupabaseAgentAdminRepository } from "@/adapters/agents/supabase-agent-admin-repository";

beforeEach(() => vi.clearAllMocks());

describe("Supabase agent admin repository", () => {
  it("keeps the line_agents select-by-slug query and error mapping", async () => {
    const response = Promise.resolve({ data: { slug: "operations", enabled: true }, error: null });
    const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn(() => response) };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const from = vi.fn(() => query);
    getMainSupabase.mockReturnValue({ from });

    await expect(createSupabaseAgentAdminRepository().getBySlug("operations")).resolves.toEqual({
      data: { slug: "operations", enabled: true },
      errorMessage: null,
    });
    expect(from).toHaveBeenCalledWith("line_agents");
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.eq).toHaveBeenCalledWith("slug", "operations");
  });

  it("keeps line_agents update, status projection, and activity persistence", async () => {
    const updateQuery = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn(async () => ({ data: { slug: "operations", enabled: false }, error: null })),
    };
    updateQuery.update.mockReturnValue(updateQuery);
    updateQuery.eq.mockReturnValue(updateQuery);
    updateQuery.select.mockReturnValue(updateQuery);
    const statusResponse = Promise.resolve({ data: [{ slug: "operations", enabled: true }], error: null });
    const statusQuery = { select: vi.fn(), then: statusResponse.then.bind(statusResponse) };
    statusQuery.select.mockReturnValue(statusQuery);
    const activityQuery = { insert: vi.fn(async () => ({ error: null })) };
    const from = vi.fn((table: string) => {
      if (table === "line_agent_activity") return activityQuery;
      if (from.mock.calls.length === 2) return statusQuery;
      return updateQuery;
    });
    getMainSupabase.mockReturnValue({ from });
    const repository = createSupabaseAgentAdminRepository();

    await expect(repository.updateBySlug("operations", {
      updated_at: "now",
      enabled: false,
      settings: { tone: "brief" },
    })).resolves.toEqual({
      data: { slug: "operations", enabled: false },
      errorMessage: null,
    });
    await expect(repository.listStatuses()).resolves.toEqual({ data: [{ slug: "operations", enabled: true }], error: null });
    await repository.recordActivity({ agent_slug: "operations", summary: "Agent 已停用", status: "success" });

    expect(updateQuery.update).toHaveBeenCalledWith({
      updated_at: "now",
      enabled: false,
      settings: { tone: "brief" },
    });
    expect(updateQuery.eq).toHaveBeenCalledWith("slug", "operations");
    expect(updateQuery.select).toHaveBeenCalledWith();
    expect(statusQuery.select).toHaveBeenCalledWith("slug,enabled");
    expect(activityQuery.insert).toHaveBeenCalledWith({
      agent_slug: "operations",
      summary: "Agent 已停用",
      status: "success",
    });
  });

  it("rejects non-JSON settings before calling the database", async () => {
    const from = vi.fn();
    getMainSupabase.mockReturnValue({ from });

    await expect(
      createSupabaseAgentAdminRepository().updateBySlug("operations", {
        updated_at: "now",
        settings: new Date(),
      })
    ).rejects.toThrow("Agent settings must be JSON serializable");
    expect(from).not.toHaveBeenCalled();
  });
});
