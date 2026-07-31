import { describe, expect, it } from "vitest";
import { parseGoalUpdateRequest } from "@/modules/goals/update-rules";

const catalog = [{ slug: "support" }];
const metrics = [{ id: "support-response" }];
const now = new Date("2026-07-31T12:00:00.000Z");

describe("parseGoalUpdateRequest", () => {
  it("builds the existing goal shape and normalizes numeric fields", () => {
    expect(
      parseGoalUpdateRequest(
        {
          id: "  goal-1 ",
          agentSlug: "support",
          metricId: "support-response",
          target: "3",
          startValue: "bad",
          cadence: "monthly",
          dueDate: "2026-08-31",
          note: "  respond faster  ",
        },
        catalog,
        metrics,
        now,
      ),
    ).toEqual({
      kind: "ok",
      goal: {
        id: "goal-1",
        agentSlug: "support",
        metricId: "support-response",
        target: 3,
        startValue: 0,
        startDate: "2026-07-31",
        dueDate: "2026-08-31",
        cadence: "monthly",
        note: "respond faster",
      },
    });
  });

  it("keeps the existing validation messages", () => {
    expect(parseGoalUpdateRequest({}, catalog, metrics, now)).toEqual({ kind: "invalid", message: "缺少 id" });
    expect(
      parseGoalUpdateRequest({ id: "g", agentSlug: "unknown", metricId: "support-response", cadence: "monthly", dueDate: "x" }, catalog, metrics, now),
    ).toEqual({ kind: "invalid", message: "agentSlug 不合法" });
    expect(
      parseGoalUpdateRequest({ id: "g", agentSlug: "support", metricId: "unknown", cadence: "monthly", dueDate: "x" }, catalog, metrics, now),
    ).toEqual({ kind: "invalid", message: "找不到這個指標" });
    expect(
      parseGoalUpdateRequest({ id: "g", agentSlug: "support", metricId: "support-response", cadence: "daily", dueDate: "x" }, catalog, metrics, now),
    ).toEqual({ kind: "invalid", message: "cadence 不合法" });
    expect(
      parseGoalUpdateRequest({ id: "g", agentSlug: "support", metricId: "support-response", cadence: "monthly" }, catalog, metrics, now),
    ).toEqual({ kind: "invalid", message: "缺少期限" });
  });
});
