import { describe, expect, it, vi } from "vitest";
import { runGoalsRead } from "@/modules/goals/read-application";

describe("runGoalsRead", () => {
  it("returns the existing goal list", async () => {
    const goals = [{ id: "goal-1", agentSlug: "support", metricId: "support-response" }] as never[];
    const list = vi.fn(async () => goals);
    await expect(runGoalsRead({ list })).resolves.toEqual({ kind: "ok", data: goals });
    expect(list).toHaveBeenCalledOnce();
  });
});
