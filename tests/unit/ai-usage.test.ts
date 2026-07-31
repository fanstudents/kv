import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseAiUsageRepository } = vi.hoisted(() => ({ createSupabaseAiUsageRepository: vi.fn() }));

vi.mock("@/adapters/ai-usage/supabase-ai-usage-repository", () => ({ createSupabaseAiUsageRepository }));

import { GET } from "@/app/api/ai-usage/route";
import { readAiUsage, summarizeAiUsage, type AiUsageRepository, type AiUsageRow } from "@/modules/ai-usage/usage";

const budget = {
  daily: { spent: 1.25, limit: 5 },
  monthly: { spent: 7.5, limit: 60 },
};

function row(overrides: Partial<AiUsageRow> = {}): AiUsageRow {
  return {
    agent_slug: "support",
    operation: "名片辨識",
    model: "gpt-4o-mini",
    prompt_tokens: 4,
    completion_tokens: 6,
    total_tokens: 10,
    cost_usd: 0.2,
    created_at: "2026-07-31T12:00:00.000Z",
    ...overrides,
  };
}

function createRepository(): AiUsageRepository {
  return {
    listRows: vi.fn(async () => ({ data: [], error: null })),
    getBudgetStatus: vi.fn(async () => budget),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("AI usage reporting capability", () => {
  it("summarizes total and rolling time windows with existing coercion", () => {
    const now = Date.parse("2026-07-31T12:00:00.000Z");
    const rows = [
      row(),
      row({ total_tokens: 20, cost_usd: 0.4, created_at: "2026-07-25T12:00:00.000Z" }),
      row({ total_tokens: 30, cost_usd: 0.6, created_at: "2026-06-30T11:59:59.000Z" }),
    ];

    const report = summarizeAiUsage(rows, now);
    expect(report.total).toMatchObject({ count: 3, tokens: 60 });
    expect(report.total.cost).toBeCloseTo(1.2);
    expect(report.last30).toMatchObject({ count: 2, tokens: 30 });
    expect(report.last30.cost).toBeCloseTo(0.6);
    expect(report.last7).toMatchObject({ count: 2, tokens: 30 });
    expect(report.last7.cost).toBeCloseTo(0.6);
    expect(report.recent).toEqual(rows);
  });

  it("sorts operation and model groups by descending cost", () => {
    const now = Date.parse("2026-07-31T12:00:00.000Z");
    const rows = [
      row({ operation: "名片辨識", model: "small", cost_usd: 0.1 }),
      row({ operation: "邀約信撰寫", model: "large", cost_usd: 1.5 }),
      row({ operation: "邀約信撰寫", model: "large", cost_usd: 0.5 }),
    ];

    expect(summarizeAiUsage(rows, now).operations).toEqual([
      { operation: "邀約信撰寫", model: "large", count: 2, tokens: 20, cost: 2 },
      { operation: "名片辨識", model: "small", count: 1, tokens: 10, cost: 0.1 },
    ]);
    expect(summarizeAiUsage(rows, now).models).toEqual([
      { model: "large", count: 2, tokens: 20, cost: 2 },
      { model: "small", count: 1, tokens: 10, cost: 0.1 },
    ]);
  });

  it("keeps the first 50 recent rows and empty input shape", () => {
    const rows = Array.from({ length: 55 }, (_, index) => row({ operation: "op-" + index }));
    const report = summarizeAiUsage(rows, Date.parse("2026-07-31T12:00:00.000Z"));

    expect(report.recent).toHaveLength(50);
    expect(report.recent[0]).toBe(rows[0]);
    expect(report.recent[49]).toBe(rows[49]);
    expect(summarizeAiUsage([], Date.now())).toEqual({
      total: { count: 0, tokens: 0, cost: 0 },
      last30: { count: 0, tokens: 0, cost: 0 },
      last7: { count: 0, tokens: 0, cost: 0 },
      operations: [],
      models: [],
      recent: [],
    });
  });

  it("maps a row query error to the existing read failure", async () => {
    const repository = createRepository();
    vi.mocked(repository.listRows).mockResolvedValue({ data: [], error: { message: "query failed" } });

    await expect(readAiUsage(repository)).resolves.toEqual({ kind: "query-failed", message: "query failed" });
    expect(repository.getBudgetStatus).not.toHaveBeenCalled();
    expect(repository.listRows).toHaveBeenCalledWith(2000);
  });

  it("combines the report rules and budget without changing the payload", async () => {
    const repository = createRepository();
    const rows = [row()];
    vi.mocked(repository.listRows).mockResolvedValue({ data: rows, error: null });

    await expect(readAiUsage(repository, Date.parse("2026-07-31T12:00:00.000Z"))).resolves.toEqual({
      kind: "ok",
      report: {
        budget,
        total: { count: 1, tokens: 10, cost: 0.2 },
        last30: { count: 1, tokens: 10, cost: 0.2 },
        last7: { count: 1, tokens: 10, cost: 0.2 },
        operations: [{ operation: "名片辨識", model: "gpt-4o-mini", count: 1, tokens: 10, cost: 0.2 }],
        models: [{ model: "gpt-4o-mini", count: 1, tokens: 10, cost: 0.2 }],
        recent: rows,
      },
    });
    expect(repository.getBudgetStatus).toHaveBeenCalledOnce();
  });

  it("keeps budget failures outside the route error boundary", async () => {
    const repository = createRepository();
    vi.mocked(repository.getBudgetStatus).mockRejectedValue(new Error("budget unavailable"));

    await expect(readAiUsage(repository)).rejects.toThrow("budget unavailable");
  });
});

describe("AI usage route contract", () => {
  it("keeps query failures at 400 and does not read the budget", async () => {
    const repository = createRepository();
    vi.mocked(repository.listRows).mockResolvedValue({ data: [], error: { message: "database down" } });
    createSupabaseAiUsageRepository.mockReturnValueOnce(repository);

    const response = await GET();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "database down" });
    expect(repository.listRows).toHaveBeenCalledWith(2000);
    expect(repository.getBudgetStatus).not.toHaveBeenCalled();
  });

  it("keeps the successful report and budget response shape", async () => {
    const repository = createRepository();
    vi.mocked(repository.listRows).mockResolvedValue({ data: [row()], error: null });
    createSupabaseAiUsageRepository.mockReturnValueOnce(repository);

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      budget,
      total: { count: 1, tokens: 10, cost: 0.2 },
      last30: { count: 1, tokens: 10, cost: 0.2 },
      last7: { count: 1, tokens: 10, cost: 0.2 },
      operations: [{ operation: "名片辨識", model: "gpt-4o-mini", count: 1, tokens: 10, cost: 0.2 }],
      models: [{ model: "gpt-4o-mini", count: 1, tokens: 10, cost: 0.2 }],
      recent: [row()],
    });
  });
});
