import { describe, expect, it, vi } from "vitest";
import type { AgentGoal } from "@/lib/agent-goals";
import { createGoalsService, type GoalsRepository } from "@/modules/goals/service";

const goal: AgentGoal = {
  id: "goal-1",
  agentSlug: "support",
  metricId: "support-response",
  target: 3,
  startValue: 0,
  startDate: "2026-07-31",
  dueDate: "2026-08-31",
  cadence: "monthly",
};

function repository(overrides: Partial<GoalsRepository> = {}): GoalsRepository {
  return {
    list: vi.fn(async () => [goal]),
    upsert: vi.fn(async () => goal),
    remove: vi.fn(async () => undefined),
    reset: vi.fn(async () => [goal]),
    loadHistory: vi.fn(async () => []),
    ...overrides,
  };
}

describe("Goals service", () => {
  it("reads and resets through the same domain repository", async () => {
    const repo = repository();
    const service = createGoalsService(repo);

    await expect(service.read()).resolves.toEqual({ kind: "ok", data: [goal] });
    await expect(service.reset()).resolves.toEqual({ kind: "ok", data: [goal] });
    expect(repo.list).toHaveBeenCalledOnce();
    expect(repo.reset).toHaveBeenCalledOnce();
  });

  it("persists a valid update and maps provider failures", async () => {
    const repo = repository();
    const service = createGoalsService(repo);

    await expect(service.update({ kind: "ok", goal })).resolves.toEqual({ kind: "ok", goal });
    expect(repo.upsert).toHaveBeenCalledWith(goal);

    const failed = createGoalsService(
      repository({ upsert: vi.fn(async () => { throw new Error("write failed"); }) }),
    );
    await expect(failed.update({ kind: "ok", goal })).resolves.toEqual({
      kind: "error",
      message: "write failed",
    });
  });

  it("does not call storage for invalid update or delete input", async () => {
    const repo = repository();
    const service = createGoalsService(repo);

    await expect(service.update({ kind: "invalid", message: "缺少 id" })).resolves.toEqual({
      kind: "invalid",
      message: "缺少 id",
    });
    await expect(service.delete({ kind: "invalid", message: "缺少 id" })).resolves.toEqual({
      kind: "invalid",
      message: "缺少 id",
    });
    expect(repo.upsert).not.toHaveBeenCalled();
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it("deletes valid ids and loads history unchanged", async () => {
    const points = [{ metric_id: "gsc-clicks", value: 12, captured_at: "2026-07-31T00:00:00Z" }];
    const repo = repository({ loadHistory: vi.fn(async () => points) });
    const service = createGoalsService(repo);

    await expect(service.delete({ kind: "ok", id: "goal-1" })).resolves.toEqual({ kind: "ok" });
    expect(repo.remove).toHaveBeenCalledWith("goal-1");

    await expect(service.history({ metricId: "gsc-clicks", days: 30 })).resolves.toEqual({
      kind: "ok",
      points,
    });
    expect(repo.loadHistory).toHaveBeenCalledWith("gsc-clicks", 30);
  });

  it("rejects history without a metric before reading storage", async () => {
    const repo = repository();
    const service = createGoalsService(repo);

    await expect(service.history({ metricId: null, days: 30 })).resolves.toEqual({
      kind: "invalid",
      message: "缺少 metricId",
    });
    expect(repo.loadHistory).not.toHaveBeenCalled();
  });
});
