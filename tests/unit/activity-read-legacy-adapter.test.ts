import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyActivityReadAdapter } from "@/adapters/activity/legacy-read-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy activity read adapter", () => {
  it("keeps the query shape and optional status filter", async () => {
    const response = Promise.resolve({ data: [{ id: "a1" }], error: null });
    const query = {
      limit: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      then: response.then.bind(response),
    };
    query.limit.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));
    getSupabase.mockReturnValue({ from });
    const adapter = createLegacyActivityReadAdapter();

    await expect(adapter.list("failed", 25)).resolves.toEqual({ data: [{ id: "a1" }], error: null });
    expect(getSupabase).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("line_agent_activity");
    expect(select).toHaveBeenCalledWith("*");
    expect(query.order).toHaveBeenCalledWith("occurred_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(25);
    expect(query.eq).toHaveBeenCalledWith("status", "failed");
  });

  it("keeps the agent activity filter before ordering", async () => {
    const response = Promise.resolve({ data: [{ id: "a1" }], error: null });
    const query = {
      limit: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      then: response.then.bind(response),
    };
    query.limit.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    getSupabase.mockReturnValue({ from: vi.fn(() => ({ select: vi.fn(() => query) })) });

    await expect(createLegacyActivityReadAdapter().list(null, 20, "visit")).resolves.toEqual({ data: [{ id: "a1" }], error: null });
    expect(query.eq).toHaveBeenCalledWith("agent_slug", "visit");
    expect(query.order).toHaveBeenCalledWith("occurred_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(20);
  });

  it("does not add an empty status filter", async () => {
    const response = Promise.resolve({ data: [], error: null });
    const query = {
      limit: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      then: response.then.bind(response),
    };
    query.limit.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    const select = vi.fn(() => query);
    getSupabase.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(createLegacyActivityReadAdapter().list("", 200)).resolves.toEqual({ data: [], error: null });
    expect(query.eq).not.toHaveBeenCalled();
  });
});
