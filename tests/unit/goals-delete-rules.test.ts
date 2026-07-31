import { describe, expect, it } from "vitest";
import { parseGoalDeleteRequest } from "@/modules/goals/delete-rules";

describe("parseGoalDeleteRequest", () => {
  it("requires a query id", () => {
    expect(parseGoalDeleteRequest(null)).toEqual({ kind: "invalid", message: "缺少 id" });
    expect(parseGoalDeleteRequest("")).toEqual({ kind: "invalid", message: "缺少 id" });
  });

  it("keeps the existing id", () => {
    expect(parseGoalDeleteRequest("goal-1")).toEqual({ kind: "ok", id: "goal-1" });
  });
});
