import { describe, expect, it } from "vitest";
import {
  displayName,
  findActiveMeetingAgent,
  parseMeetingCommandRequest,
  selectMeetingRoster,
  toMeetingAgentInput,
  withMeetingReplyFallback,
  type MeetingCatalogAgent,
} from "@/modules/meeting/command-rules";

const agents: MeetingCatalogAgent[] = [
  {
    slug: "teamlead",
    name: "總管 Agent",
    role: "Team Lead 大總管",
    description: "lead",
    personEn: "Vivian",
    personZh: "薇薇安",
    status: "active",
  },
  {
    slug: "report",
    name: "數據 Agent",
    role: "數據參謀",
    description: "report",
    personEn: "Ivy",
    personZh: "艾薇",
    status: "active",
  },
  {
    slug: "draft",
    name: "草稿 Agent",
    role: "草稿",
    description: "draft",
    personEn: "Draft",
    personZh: "草稿",
    status: "draft",
  },
  {
    slug: "paused",
    name: "暫停 Agent",
    role: "暫停",
    description: "paused",
    personEn: "Pause",
    personZh: "暫停",
    status: "paused",
  },
];

describe("Meeting command deterministic rules", () => {
  it("trims command while preserving meeting id and target slug", () => {
    expect(
      parseMeetingCommandRequest({
        meetingId: "meeting-1",
        command: "  請整理進度  ",
        targetSlug: " report ",
        ignored: true,
      })
    ).toEqual({ meetingId: "meeting-1", command: "請整理進度", targetSlug: " report " });
  });

  it.each([null, {}, { meetingId: "", command: "go" }, { meetingId: "id", command: "  " }])(
    "rejects missing meeting command fields %#",
    (payload) => expect(parseMeetingCommandRequest(payload)).toBeNull()
  );

  it("maps exact display and provider input fields", () => {
    expect(displayName(agents[1])).toBe("Ivy 艾薇");
    expect(toMeetingAgentInput(agents[1])).toEqual({
      slug: "report",
      name: "Ivy 艾薇",
      role: "數據參謀",
      description: "report",
    });
  });

  it("keeps Team Lead selection and active responder order", () => {
    expect(selectMeetingRoster(agents)).toEqual({
      teamLead: agents[0],
      responders: [agents[1]],
    });
  });

  it("requires an active target Agent", () => {
    expect(findActiveMeetingAgent(agents, "report")).toBe(agents[1]);
    expect(findActiveMeetingAgent(agents, "draft")).toBeNull();
    expect(findActiveMeetingAgent(agents, "missing")).toBeNull();
  });

  it("preserves the one-to-one empty reply fallback", () => {
    expect(withMeetingReplyFallback("完成")).toBe("完成");
    expect(withMeetingReplyFallback("")).toBe("收到，我馬上處理，稍後回報進度給您。");
  });
});
