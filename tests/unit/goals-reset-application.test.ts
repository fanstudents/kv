import { describe, expect, it, vi } from "vitest";
import { runGoalsReset } from "@/modules/goals/reset-application";

describe("runGoalsReset", () => {
  it("returns the reset default goals", async () => {
    const goals = [{ id: "seed-1" }] as never[];
    const reset = vi.fn(async () => goals);
    await expect(runGoalsReset({ reset })).resolves.toEqual({ kind: "ok", data: goals });
    expect(reset).toHaveBeenCalledOnce();
  });
});
