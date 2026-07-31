import { beforeEach, describe, expect, it, vi } from "vitest";

const { metricHistory } = vi.hoisted(() => ({ metricHistory: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/agent-memory", () => ({ metricHistory }));

import { createLegacyGoalsHistoryAdapter } from "@/adapters/goals/legacy-history-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy Goals history adapter", () => {
  it("keeps the existing metricHistory helper boundary", async () => {
    const points = [{ metric_id: "gsc-clicks", value: 12, captured_at: "2026-07-31T00:00:00Z" }];
    metricHistory.mockResolvedValue(points);
    const adapter = createLegacyGoalsHistoryAdapter();

    await expect(adapter.load("gsc-clicks", 30)).resolves.toEqual(points);
    expect(metricHistory).toHaveBeenCalledWith("gsc-clicks", 30);
  });
});
