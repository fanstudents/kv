import { describe, expect, it } from "vitest";
import { parseAgentOverviewDays } from "@/modules/agents/overview-read-rules";

describe("parseAgentOverviewDays", () => {
  it("keeps the existing numeric range and default behavior", () => {
    expect(parseAgentOverviewDays("14")).toBe(14);
    expect(parseAgentOverviewDays("0")).toBe(7);
    expect(parseAgentOverviewDays(null)).toBe(7);
    expect(parseAgentOverviewDays("not-a-number")).toBe(7);
    expect(parseAgentOverviewDays("-3")).toBe(-3);
  });
});
