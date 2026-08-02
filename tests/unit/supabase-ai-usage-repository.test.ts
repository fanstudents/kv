import { beforeEach, describe, expect, it, vi } from "vitest";

const { budgetStatus, getMainSupabase } = vi.hoisted(() => ({
  budgetStatus: vi.fn(),
  getMainSupabase: vi.fn(),
}));

vi.mock("@/lib/ai-usage", () => ({ budgetStatus }));
vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createSupabaseAiUsageRepository } from "@/adapters/ai-usage/supabase-ai-usage-repository";

beforeEach(() => vi.clearAllMocks());

describe("Supabase AI usage repository", () => {
  it("keeps the existing query shape and budget helper", async () => {
    const rows = [{ operation: "名片辨識", model: "gpt-4o-mini", cost_usd: 0.2 }];
    const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    getMainSupabase.mockReturnValue({ from: vi.fn(() => ({ select })) });
    budgetStatus.mockResolvedValue({
      daily: { spent: 1, limit: 5 },
      monthly: { spent: 4, limit: 60 },
    });
    const repository = createSupabaseAiUsageRepository();

    await expect(repository.listRows(2000)).resolves.toEqual({ data: rows, error: null });
    await expect(repository.getBudgetStatus()).resolves.toEqual({
      daily: { spent: 1, limit: 5 },
      monthly: { spent: 4, limit: 60 },
    });
    expect(getMainSupabase).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledWith("*");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(2000);
    expect(budgetStatus).toHaveBeenCalledOnce();
  });

  it("maps a query error to its message while keeping rows empty", async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: { message: "database down" } });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    getMainSupabase.mockReturnValue({ from: vi.fn(() => ({ select })) });
    const repository = createSupabaseAiUsageRepository();

    await expect(repository.listRows(2000)).resolves.toEqual({ data: [], error: { message: "database down" } });
  });
});
