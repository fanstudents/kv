import { describe, expect, it } from "vitest";
import { parseTvIdleAgent } from "@/modules/tv/idle-rules";

describe("TV idle agent rules", () => {
  it("keeps the three supported query values", () => {
    expect(parseTvIdleAgent("schedule")).toBe("schedule");
    expect(parseTvIdleAgent("visit")).toBe("visit");
    expect(parseTvIdleAgent("teamlead")).toBe("teamlead");
  });

  it("maps missing and unknown values to the existing unknown branch", () => {
    expect(parseTvIdleAgent(null)).toBe("unknown");
    expect(parseTvIdleAgent("")).toBe("unknown");
    expect(parseTvIdleAgent("orders")).toBe("unknown");
  });
});
