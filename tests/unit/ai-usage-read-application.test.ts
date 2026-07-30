import { describe, expect, it, vi } from "vitest";
import { runAiUsageRead } from "@/modules/ai-usage/read-application";
import type { AiUsageReadPort } from "@/modules/ai-usage/read-ports";

const budget = {
  daily: { spent: 1.25, limit: 5 },
  monthly: { spent: 7.5, limit: 60 },
};

function createPort(): AiUsageReadPort {
  return {
    listRows: vi.fn(async () => ({ data: [], error: null })),
    getBudgetStatus: vi.fn(async () => budget),
  };
}

describe("AI usage read application", () => {
  it("maps a row query error to the existing read failure", async () => {
    const port = createPort();
    vi.mocked(port.listRows).mockResolvedValue({ data: [], error: { message: "query failed" } });

    await expect(runAiUsageRead(port)).resolves.toEqual({ kind: "query-failed", message: "query failed" });
    expect(port.getBudgetStatus).not.toHaveBeenCalled();
    expect(port.listRows).toHaveBeenCalledWith(2000);
  });

  it("combines the report rules and budget without changing the payload", async () => {
    const port = createPort();
    const rows = [
      {
        agent_slug: "support",
        operation: "摘要",
        model: "gpt-4o-mini",
        prompt_tokens: 4,
        completion_tokens: 6,
        total_tokens: 10,
        cost_usd: 0.2,
        created_at: "2026-07-31T12:00:00.000Z",
      },
    ];
    vi.mocked(port.listRows).mockResolvedValue({ data: rows, error: null });

    await expect(runAiUsageRead(port, Date.parse("2026-07-31T12:00:00.000Z"))).resolves.toEqual({
      kind: "ok",
      report: {
        budget,
        total: { count: 1, tokens: 10, cost: 0.2 },
        last30: { count: 1, tokens: 10, cost: 0.2 },
        last7: { count: 1, tokens: 10, cost: 0.2 },
        operations: [{ operation: "摘要", model: "gpt-4o-mini", count: 1, tokens: 10, cost: 0.2 }],
        models: [{ model: "gpt-4o-mini", count: 1, tokens: 10, cost: 0.2 }],
        recent: rows,
      },
    });
    expect(port.getBudgetStatus).toHaveBeenCalledOnce();
  });

  it("keeps budget failures outside the new route error boundary", async () => {
    const port = createPort();
    vi.mocked(port.getBudgetStatus).mockRejectedValue(new Error("budget unavailable"));

    await expect(runAiUsageRead(port)).rejects.toThrow("budget unavailable");
  });
});
