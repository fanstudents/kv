import { describe, expect, it } from "vitest";
import {
  findActiveRealtimeAgent,
  parseRealtimeSessionRequest,
  toRealtimeAgentProfile,
  type RealtimeCatalogAgent,
} from "@/modules/meeting/realtime-session-rules";

const agents: RealtimeCatalogAgent[] = [
  {
    slug: "teamlead",
    personEn: "Vivian",
    personZh: "薇薇安",
    role: "Team Lead 大總管",
    description: "lead",
    status: "active",
  },
  {
    slug: "report",
    personEn: "Ivy",
    personZh: "艾薇",
    role: "數據參謀",
    description: "report",
    status: "active",
  },
  {
    slug: "paused",
    personEn: "Pause",
    personZh: "暫停",
    role: "暫停",
    description: "paused",
    status: "paused",
  },
];

describe("Meeting realtime-session deterministic rules", () => {
  it("preserves string fields and exact demo flag", () => {
    expect(
      parseRealtimeSessionRequest({ slug: "report", meetingId: "m-1", voice: "coral", demo: true })
    ).toEqual({ slug: "report", meetingId: "m-1", voice: "coral", demo: true });
    expect(parseRealtimeSessionRequest({ slug: "report", demo: 1 }).demo).toBe(false);
  });

  it("applies the existing defaults to non-string fields", () => {
    expect(parseRealtimeSessionRequest(null)).toEqual({
      slug: "",
      meetingId: "",
      voice: "alloy",
      demo: false,
    });
    expect(parseRealtimeSessionRequest({ slug: 1, meetingId: 2, voice: null })).toEqual({
      slug: "",
      meetingId: "",
      voice: "alloy",
      demo: false,
    });
  });

  it("requires an active Agent", () => {
    expect(findActiveRealtimeAgent(agents, "report")).toBe(agents[1]);
    expect(findActiveRealtimeAgent(agents, "paused")).toBeNull();
    expect(findActiveRealtimeAgent(agents, "missing")).toBeNull();
  });

  it("maps the existing display fields and Team Lead flag", () => {
    expect(toRealtimeAgentProfile(agents[0])).toEqual({
      slug: "teamlead",
      name: "Vivian 薇薇安",
      role: "Team Lead 大總管",
      description: "lead",
      isTeamLead: true,
    });
  });
});
