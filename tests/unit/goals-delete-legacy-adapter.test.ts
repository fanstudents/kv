import { describe, expect, it, vi } from "vitest";

const { deleteGoal } = vi.hoisted(() => ({ deleteGoal: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/agent-goals-server", () => ({ deleteGoal }));

import { createLegacyGoalDeleteAdapter } from "@/adapters/goals/legacy-delete-adapter";

describe("createLegacyGoalDeleteAdapter", () => {
  it("keeps the existing deleteGoal helper behind the port", async () => {
    deleteGoal.mockResolvedValue(undefined);
    await expect(createLegacyGoalDeleteAdapter().remove("goal-1")).resolves.toBeUndefined();
    expect(deleteGoal).toHaveBeenCalledWith("goal-1");
  });
});
