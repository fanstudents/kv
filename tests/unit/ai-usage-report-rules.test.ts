import { describe, expect, it } from "vitest";
import { summarizeAiUsage, type AiUsageRow } from "@/modules/ai-usage/report-rules";

function row(overrides: Partial<AiUsageRow> = {}): AiUsageRow {
  return {
    agent_slug: "support",
    operation: "摘要",
    model: "gpt-4o-mini",
    prompt_tokens: 4,
    completion_tokens: 6,
    total_tokens: 10,
    cost_usd: 0.2,
    created_at: "2026-07-31T12:00:00.000Z",
    ...overrides,
  };
}

describe("AI usage report rules", () => {
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
      row({ operation: "低成本", model: "small", cost_usd: 0.1 }),
      row({ operation: "高成本", model: "large", cost_usd: 1.5 }),
      row({ operation: "高成本", model: "large", cost_usd: 0.5 }),
    ];

    expect(summarizeAiUsage(rows, now).operations).toEqual([
      { operation: "高成本", model: "large", count: 2, tokens: 20, cost: 2 },
      { operation: "低成本", model: "small", count: 1, tokens: 10, cost: 0.1 },
    ]);
    expect(summarizeAiUsage(rows, now).models).toEqual([
      { model: "large", count: 2, tokens: 20, cost: 2 },
      { model: "small", count: 1, tokens: 10, cost: 0.1 },
    ]);
  });

  it("keeps the first 50 recent rows and empty input shape", () => {
    const rows = Array.from({ length: 55 }, (_, index) => row({ operation: `op-${index}` }));
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
});
