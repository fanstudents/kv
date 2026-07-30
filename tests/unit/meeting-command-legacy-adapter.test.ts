import { beforeEach, describe, expect, it, vi } from "vitest";

const { appendTurns, getRecentHistory, replyAsAgent, runMeetingRound } = vi.hoisted(() => ({
  appendTurns: vi.fn(),
  getRecentHistory: vi.fn(),
  replyAsAgent: vi.fn(),
  runMeetingRound: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/meeting-store", () => ({ appendTurns, getRecentHistory }));
vi.mock("@/lib/openai", () => ({ replyAsAgent, runMeetingRound }));

import { createLegacyMeetingCommandAdapter } from "@/adapters/meeting/legacy-command-adapter";
import type { MeetingAgentInput } from "@/modules/meeting/command-rules";

const agent: MeetingAgentInput = {
  slug: "report",
  name: "Ivy 艾薇",
  role: "數據參謀",
  description: "desc",
};

beforeEach(() => vi.clearAllMocks());

describe("legacy Meeting command adapter", () => {
  it("delegates history loading with the existing optional limit", async () => {
    getRecentHistory.mockResolvedValue("history");
    const ports = createLegacyMeetingCommandAdapter();

    await expect(ports.history.load("meeting-1", 8)).resolves.toBe("history");
    expect(getRecentHistory).toHaveBeenCalledWith("meeting-1", 8);
  });

  it("maps one-to-one replies without changing arguments", async () => {
    replyAsAgent.mockResolvedValue("reply");
    const ports = createLegacyMeetingCommandAdapter();

    await expect(
      ports.replies.oneToOne({ agent, command: "go", history: "history", isTeamLead: false })
    ).resolves.toBe("reply");
    expect(replyAsAgent).toHaveBeenCalledWith({
      agent,
      command: "go",
      history: "history",
      isTeamLead: false,
    });
  });

  it("delegates batch rounds and preserves the result", async () => {
    const result = { replies: [{ slug: "report", text: "reply" }], teamlead: "summary" };
    runMeetingRound.mockResolvedValue(result);
    const ports = createLegacyMeetingCommandAdapter();

    await expect(
      ports.replies.round({ command: "go", teamLead: agent, agents: [agent], history: "history" })
    ).resolves.toBe(result);
    expect(runMeetingRound).toHaveBeenCalledWith({
      command: "go",
      teamLead: agent,
      agents: [agent],
      history: "history",
    });
  });

  it("preserves the existing turn persistence shape", async () => {
    const turns = [{ role: "boss" as const, content: "go" }];
    const ports = createLegacyMeetingCommandAdapter();

    await ports.turns.append("meeting-1", turns);
    expect(appendTurns).toHaveBeenCalledWith("meeting-1", turns);
  });
});
