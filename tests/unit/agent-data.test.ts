import { describe, expect, it } from "vitest";
import { AGENTS, MARKETING_SLUGS, agentTeam, getAgent } from "@/lib/agent-data";

describe("agent registry", () => {
  it("keeps the current twelve-agent catalog addressable by slug", () => {
    expect(AGENTS).toHaveLength(12);
    expect(new Set(AGENTS.map((agent) => agent.slug)).size).toBe(AGENTS.length);
    expect(getAgent("visit")?.slug).toBe("visit");
    expect(getAgent("missing")).toBeUndefined();
  });

  it("keeps the current marketing and admin team classification", () => {
    expect(MARKETING_SLUGS).toEqual(["today", "expense", "card", "report", "competitor"]);
    expect(agentTeam("today")).toBe("marketing");
    expect(agentTeam("visit")).toBe("admin");
  });
});
