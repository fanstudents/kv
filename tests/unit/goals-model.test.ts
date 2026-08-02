import { describe, expect, it } from "vitest";
import {
  defaultDueDate,
  formatGoalValue,
  goalProgress,
  metricsForAgent,
  type AgentGoal,
} from "@/modules/goals/model";

const supportResponseGoal: AgentGoal = {
  id: "goal-support-response",
  agentSlug: "support",
  metricId: "support-response",
  target: 3,
  startValue: 9,
  startDate: "2026-08-01",
  dueDate: "2026-08-31",
  cadence: "monthly",
};

describe("Goals model", () => {
  it("keeps the direction-aware progress and display rules with the domain catalog", () => {
    const progress = goalProgress(supportResponseGoal, new Date("2026-08-16T12:00:00Z"));

    expect(progress).toMatchObject({
      metric: { id: "support-response", direction: "down" },
      current: 6.4,
      daysLeft: 16,
      status: "at-risk",
    });
    expect(progress?.ratio).toBeCloseTo(0.4333333333333333);
    expect(progress?.remaining).toBeCloseTo(3.4);
    expect(formatGoalValue("minutes", 6.4)).toBe("6.4 分");
  });

  it("keeps catalog recommendations and cadence dates in the Goals owner", () => {
    expect(metricsForAgent("support").slice(0, 2).map((metric) => metric.id)).toEqual([
      "reputation-negative",
      "support-response",
    ]);
    expect(defaultDueDate("weekly", new Date("2026-08-01T00:00:00Z"))).toBe("2026-08-08");
  });
});
