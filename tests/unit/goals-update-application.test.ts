import { describe, expect, it, vi } from "vitest";
import { runGoalUpdate } from "@/modules/goals/update-application";

const goal = {
  id: "goal-1",
  agentSlug: "support" as const,
  metricId: "support-response",
  target: 3,
  startValue: 0,
  startDate: "2026-07-31",
  dueDate: "2026-08-31",
  cadence: "monthly" as const,
};

describe("runGoalUpdate", () => {
  it("returns the persisted goal", async () => {
    const upsert = vi.fn(async () => goal);
    await expect(runGoalUpdate({ kind: "ok", goal }, { upsert })).resolves.toEqual({ kind: "ok", goal });
    expect(upsert).toHaveBeenCalledWith(goal);
  });

  it("maps invalid input and provider failures", async () => {
    const upsert = vi.fn();
    await expect(runGoalUpdate({ kind: "invalid", message: "缺少 id" }, { upsert })).resolves.toEqual({
      kind: "invalid",
      message: "缺少 id",
    });
    expect(upsert).not.toHaveBeenCalled();
    await expect(
      runGoalUpdate({ kind: "ok", goal }, { upsert: vi.fn(async () => { throw new Error("write failed"); }) }),
    ).resolves.toEqual({ kind: "error", message: "write failed" });
  });
});
