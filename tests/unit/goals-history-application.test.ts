import { describe, expect, it, vi } from "vitest";
import { runGoalsHistory } from "@/modules/goals/history-application";

describe("Goals history application", () => {
  it("rejects a missing metric before reading storage", async () => {
    const port = { load: vi.fn() };

    await expect(runGoalsHistory({ metricId: null, days: 30 }, port)).resolves.toEqual({
      kind: "invalid",
      message: "缺少 metricId",
    });
    expect(port.load).not.toHaveBeenCalled();
  });

  it("returns the legacy points unchanged", async () => {
    const points = [{ metric_id: "gsc-clicks", value: 12, captured_at: "2026-07-31T00:00:00Z" }];
    const port = { load: vi.fn().mockResolvedValue(points) };

    await expect(runGoalsHistory({ metricId: "gsc-clicks", days: 30 }, port)).resolves.toEqual({
      kind: "ok",
      points,
    });
    expect(port.load).toHaveBeenCalledWith("gsc-clicks", 30);
  });
});
