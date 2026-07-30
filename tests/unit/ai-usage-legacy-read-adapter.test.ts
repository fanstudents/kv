import { beforeEach, describe, expect, it, vi } from "vitest";

const { budgetStatus, getSupabase } = vi.hoisted(() => ({
  budgetStatus: vi.fn(),
  getSupabase: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai-usage", () => ({ budgetStatus }));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyAiUsageReadAdapter } from "@/adapters/ai-usage/legacy-read-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy AI usage read adapter", () => {
  it("keeps the existing query shape and budget helper", async () => {
    const rows = [{ operation: "摘要", model: "gpt-4o-mini", cost_usd: 0.2 }];
    const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    getSupabase.mockReturnValue({ from: vi.fn(() => ({ select })) });
    budgetStatus.mockResolvedValue({
      daily: { spent: 1, limit: 5 },
      monthly: { spent: 4, limit: 60 },
    });
    const adapter = createLegacyAiUsageReadAdapter();

    await expect(adapter.listRows(2000)).resolves.toEqual({ data: rows, error: null });
    await expect(adapter.getBudgetStatus()).resolves.toEqual({
      daily: { spent: 1, limit: 5 },
      monthly: { spent: 4, limit: 60 },
    });
    expect(getSupabase).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledWith("*");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(2000);
    expect(budgetStatus).toHaveBeenCalledOnce();
  });

  it("maps a legacy query error to its message while keeping rows empty", async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: { message: "database down" } });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    getSupabase.mockReturnValue({ from: vi.fn(() => ({ select })) });
    const adapter = createLegacyAiUsageReadAdapter();

    await expect(adapter.listRows(2000)).resolves.toEqual({ data: [], error: { message: "database down" } });
  });
});
