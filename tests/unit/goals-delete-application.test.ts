import { describe, expect, it, vi } from "vitest";
import { runGoalDelete } from "@/modules/goals/delete-application";

describe("runGoalDelete", () => {
  it("removes a valid goal", async () => {
    const remove = vi.fn(async () => undefined);
    await expect(runGoalDelete({ kind: "ok", id: "goal-1" }, { remove })).resolves.toEqual({ kind: "ok" });
    expect(remove).toHaveBeenCalledWith("goal-1");
  });

  it("does not call the provider for invalid input", async () => {
    const remove = vi.fn(async () => undefined);
    await expect(runGoalDelete({ kind: "invalid", message: "缺少 id" }, { remove })).resolves.toEqual({
      kind: "invalid",
      message: "缺少 id",
    });
    expect(remove).not.toHaveBeenCalled();
  });
});
