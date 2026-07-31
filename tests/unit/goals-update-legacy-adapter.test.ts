import { describe, expect, it, vi } from "vitest";

const { upsertGoal } = vi.hoisted(() => ({ upsertGoal: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/agent-goals-server", () => ({ upsertGoal }));

import { createLegacyGoalUpdateAdapter } from "@/adapters/goals/legacy-update-adapter";

describe("createLegacyGoalUpdateAdapter", () => {
  it("keeps the existing upsertGoal helper behind the port", async () => {
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
    upsertGoal.mockResolvedValue(goal);
    await expect(createLegacyGoalUpdateAdapter().upsert(goal)).resolves.toEqual(goal);
    expect(upsertGoal).toHaveBeenCalledWith(goal);
  });
});
