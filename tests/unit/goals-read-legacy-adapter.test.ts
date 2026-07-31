import { describe, expect, it, vi } from "vitest";

const { listGoals } = vi.hoisted(() => ({ listGoals: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/agent-goals-server", () => ({ listGoals }));

import { createLegacyGoalsReadAdapter } from "@/adapters/goals/legacy-read-adapter";

describe("createLegacyGoalsReadAdapter", () => {
  it("keeps the existing listGoals helper behind the port", async () => {
    const goals = [{ id: "goal-1" }];
    listGoals.mockResolvedValue(goals);
    await expect(createLegacyGoalsReadAdapter().list()).resolves.toEqual(goals);
    expect(listGoals).toHaveBeenCalledOnce();
  });
});
