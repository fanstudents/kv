import { beforeEach, describe, expect, it, vi } from "vitest";

const { createChatCompletion } = vi.hoisted(() => ({ createChatCompletion: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/adapters/openai/client", () => ({ createChatCompletion }));

import { createOpenAiMeetingConversationProvider } from "@/adapters/meeting/openai-meeting-conversation-provider";
import {
  displayName,
  findActiveMeetingAgent,
  parseMeetingCommandRequest,
  runMeetingConversation,
  selectMeetingRoster,
  toMeetingAgentInput,
  withMeetingReplyFallback,
} from "@/modules/meeting/conversation";
import type {
  MeetingCatalogAgent,
  MeetingConversationProvider,
} from "@/modules/meeting/conversation";
import type { MeetingSessionRepository } from "@/modules/meeting/session";

const FALLBACK_REPLY = "\u6536\u5230\uff0c\u6211\u99ac\u4e0a\u8655\u7406\uff0c\u7a0d\u5f8c\u56de\u5831\u9032\u5ea6\u7d66\u60a8\u3002";
const FALLBACK_ERROR = "\u6703\u8b70\u56de\u61c9\u5931\u6557";

const teamLead: MeetingCatalogAgent = {
  slug: "teamlead",
  name: "Team Lead",
  role: "lead",
  description: "lead",
  personEn: "Vivian",
  personZh: "Lin",
  status: "active",
};
const report: MeetingCatalogAgent = {
  slug: "report",
  name: "Report Agent",
  role: "reporting",
  description: "report",
  personEn: "Ivy",
  personZh: "Chen",
  status: "active",
};
const draft: MeetingCatalogAgent = {
  slug: "draft",
  name: "Draft Agent",
  role: "drafting",
  description: "draft",
  personEn: "Draft",
  personZh: "Agent",
  status: "draft",
};

function createSession(): Pick<MeetingSessionRepository, "getHistory" | "appendTurns"> {
  return {
    getHistory: vi.fn(async () => "history"),
    appendTurns: vi.fn(async () => undefined),
  };
}

function createProvider(): MeetingConversationProvider {
  return {
    oneToOne: vi.fn(async () => "one reply"),
    round: vi.fn(async () => ({ replies: [{ slug: "report", text: "report reply" }], teamlead: "summary" })),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("Meeting conversation parsing and roster", () => {
  it("keeps command coercion, roster selection, and display fields", () => {
    expect(
      parseMeetingCommandRequest({ meetingId: "meeting-1", command: "  discuss  ", targetSlug: " report " })
    ).toEqual({ meetingId: "meeting-1", command: "discuss", targetSlug: " report " });
    expect(parseMeetingCommandRequest({ meetingId: "", command: "go" })).toBeNull();
    expect(parseMeetingCommandRequest({ meetingId: "meeting-1", command: "  " })).toBeNull();
    expect(selectMeetingRoster([teamLead, report, draft])).toEqual({
      teamLead,
      responders: [report],
    });
    expect(findActiveMeetingAgent([teamLead, report, draft], "report")).toBe(report);
    expect(findActiveMeetingAgent([teamLead, report, draft], "draft")).toBeNull();
    expect(displayName(report)).toBe("Ivy Chen");
    expect(toMeetingAgentInput(report)).toEqual({
      slug: "report",
      name: "Ivy Chen",
      role: "reporting",
      description: "report",
    });
    expect(withMeetingReplyFallback("")).toBe(FALLBACK_REPLY);
  });
});

describe("Meeting conversation behavior", () => {
  const input = { meetingId: "meeting-1", command: "go", targetSlug: "" };
  const roster = { teamLead, responders: [report], target: null };

  it("returns roster errors before any side effect", async () => {
    const session = createSession();
    const provider = createProvider();

    await expect(runMeetingConversation(input, { ...roster, teamLead: null }, session, provider)).resolves.toEqual({
      kind: "teamlead-not-found",
    });
    await expect(
      runMeetingConversation({ ...input, targetSlug: "missing" }, roster, session, provider)
    ).resolves.toEqual({ kind: "target-not-found" });
    expect(session.getHistory).not.toHaveBeenCalled();
    expect(provider.oneToOne).not.toHaveBeenCalled();
  });

  it("isolates history failure, persists the one-to-one fallback, and keeps the reply", async () => {
    const session = createSession();
    const provider = createProvider();
    vi.mocked(session.getHistory).mockRejectedValue(new Error("history down"));
    vi.mocked(provider.oneToOne).mockResolvedValue("");

    await expect(
      runMeetingConversation({ ...input, targetSlug: "report" }, { ...roster, target: report }, session, provider)
    ).resolves.toEqual({
      kind: "one-to-one",
      reply: { slug: "report", name: "Ivy Chen", text: FALLBACK_REPLY },
    });
    expect(provider.oneToOne).toHaveBeenCalledWith(expect.objectContaining({ history: "" }));
    expect(session.appendTurns).toHaveBeenCalledWith("meeting-1", [
      { role: "boss", speaker: "\u8001\u95c6", content: "go" },
      { role: "agent", agentSlug: "report", speaker: "Ivy Chen", content: FALLBACK_REPLY },
    ]);
  });

  it("maps a complete round and ignores turn persistence failure", async () => {
    const session = createSession();
    const provider = createProvider();
    vi.mocked(session.appendTurns).mockRejectedValue(new Error("write down"));

    await expect(runMeetingConversation(input, roster, session, provider)).resolves.toEqual({
      kind: "round",
      replies: [{ slug: "report", name: "Ivy Chen", text: "report reply" }],
      teamlead: { slug: "teamlead", name: "Vivian Lin", text: "summary" },
    });
    expect(provider.round).toHaveBeenCalledWith(
      expect.objectContaining({ teamLead: expect.objectContaining({ slug: "teamlead" }) })
    );
  });

  it("keeps provider failure semantics and skips turn persistence", async () => {
    const session = createSession();
    const provider = createProvider();
    vi.mocked(provider.round).mockRejectedValue("offline");

    await expect(runMeetingConversation(input, roster, session, provider)).resolves.toEqual({
      kind: "reply-failed",
      message: FALLBACK_ERROR,
    });
    expect(session.appendTurns).not.toHaveBeenCalled();
  });
});

describe("OpenAI Meeting conversation provider", () => {
  it("forwards one-to-one and round requests without reshaping the provider contract", async () => {
    const provider = createOpenAiMeetingConversationProvider();
    const agent = toMeetingAgentInput(report);
    const round = { replies: [{ slug: "report", text: "reply" }], teamlead: "summary" };
    createChatCompletion
      .mockResolvedValueOnce({ choices: [{ message: { content: "reply" } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(round) } }] });

    await expect(
      provider.oneToOne({ agent, command: "go", history: "history", isTeamLead: false })
    ).resolves.toBe("reply");
    await expect(
      provider.round({ command: "go", teamLead: agent, agents: [agent], history: "history" })
    ).resolves.toEqual(round);
    expect(createChatCompletion).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ model: "gpt-4o-mini", temperature: 0.7, max_tokens: 150 }),
      { operation: "會議一對一回應", agentSlug: "report" }
    );
    expect(createChatCompletion).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        model: "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
      { operation: "會議室回應", agentSlug: "teamlead" }
    );
  });
});
