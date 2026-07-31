import { describe, expect, it } from "vitest";
import { parseGoalsHistoryRequest } from "@/modules/goals/history-rules";

describe("Goals history rules", () => {
  it("preserves metric id and clamps the days window", () => {
    expect(parseGoalsHistoryRequest("gsc-clicks", "14")).toEqual({ metricId: "gsc-clicks", days: 14 });
    expect(parseGoalsHistoryRequest("gsc-clicks", "365")).toEqual({ metricId: "gsc-clicks", days: 180 });
    expect(parseGoalsHistoryRequest("gsc-clicks", "2")).toEqual({ metricId: "gsc-clicks", days: 7 });
  });

  it("keeps the existing default for missing or invalid days", () => {
    expect(parseGoalsHistoryRequest(null, null)).toEqual({ metricId: null, days: 30 });
    expect(parseGoalsHistoryRequest("gsc-clicks", "oops")).toEqual({ metricId: "gsc-clicks", days: 30 });
  });
});
