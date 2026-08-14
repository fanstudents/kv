import { describe, expect, it } from "vitest";
import { parseGoalHistoryResponse } from "@/lib/goal-history";

describe("goal history response", () => {
  it("keeps a valid points envelope", () => {
    const points = [{ metric_id: "metric-a", value: 12, captured_at: "2026-08-02T00:00:00.000Z" }];
    expect(parseGoalHistoryResponse({ points })).toEqual(points);
  });

  it("rejects malformed responses instead of treating them as no history", () => {
    expect(() => parseGoalHistoryResponse({})).toThrow("目標趨勢回應格式錯誤");
    expect(() => parseGoalHistoryResponse({ points: null })).toThrow("目標趨勢回應格式錯誤");
  });
});
