import { describe, expect, it, vi } from "vitest";

const { resetGoalsToDefault } = vi.hoisted(() => ({ resetGoalsToDefault: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/agent-goals-server", () => ({ resetGoalsToDefault }));

import { createLegacyGoalsResetAdapter } from "@/adapters/goals/legacy-reset-adapter";

describe("createLegacyGoalsResetAdapter", () => {
  it("keeps the existing reset helper behind the port", async () => {
    const goals = [{ id: "seed-1" }];
    resetGoalsToDefault.mockResolvedValue(goals);
    await expect(createLegacyGoalsResetAdapter().reset()).resolves.toEqual(goals);
    expect(resetGoalsToDefault).toHaveBeenCalledOnce();
  });
});
