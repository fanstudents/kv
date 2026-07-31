import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAgentLiveContext, replyToChat, buildCanvasForReply } = vi.hoisted(() => ({
  getAgentLiveContext: vi.fn(),
  replyToChat: vi.fn(),
  buildCanvasForReply: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/meeting-context", () => ({ getAgentLiveContext }));
vi.mock("@/lib/openai", () => ({ replyToChat }));
vi.mock("@/lib/chat-canvas", () => ({ buildCanvasForReply }));

import { createAgentChatComposition } from "@/adapters/agent-chat/agent-chat-composition";
import type { AgentChatAgent } from "@/modules/agent-chat/chat";

const reportAgent: AgentChatAgent = {
  slug: "report",
  name: "Ivy",
  role: "reporter",
  description: "desc",
  isTeamLead: false,
};

beforeEach(() => vi.clearAllMocks());

describe("Agent chat composition adapter", () => {
  it("maps the existing roster identity and Team Lead flag", () => {
    const ports = createAgentChatComposition();

    expect(ports.agents.find("report")).toMatchObject({ slug: "report", isTeamLead: false });
    expect(ports.agents.find("teamlead")).toMatchObject({ slug: "teamlead", isTeamLead: true });
    expect(ports.agents.find("missing")).toBeNull();
  });

  it("keeps the static roster's name, role, and description projection", () => {
    const agent = createAgentChatComposition().agents.find("report");
    expect(agent).toMatchObject({
      slug: "report",
      name: expect.stringContaining("Ivy"),
      role: expect.any(String),
      description: expect.any(String),
    });
  });

  it("delegates live context without changing arguments", async () => {
    getAgentLiveContext.mockResolvedValue("context");
    const ports = createAgentChatComposition();

    await expect(ports.context.load("report", "question")).resolves.toBe("context");
    expect(getAgentLiveContext).toHaveBeenCalledWith("report", "question");
  });

  it("maps reply and canvas payloads to existing provider helpers", async () => {
    replyToChat.mockResolvedValue("reply");
    const canvas = { kind: "action-plan", title: "plan", items: [] };
    buildCanvasForReply.mockResolvedValue(canvas);
    const ports = createAgentChatComposition();

    await expect(ports.replies.generate({ agent: reportAgent, message: "question", liveContext: "context", history: "history" })).resolves.toBe("reply");
    expect(replyToChat).toHaveBeenCalledWith({
      agent: { slug: "report", name: "Ivy", role: "reporter", description: "desc" },
      message: "question",
      liveContext: "context",
      history: "history",
      isTeamLead: false,
    });

    await expect(ports.canvas.build({ agent: reportAgent, message: "question", replyText: "reply" })).resolves.toBe(canvas);
    expect(buildCanvasForReply).toHaveBeenCalledWith({
      agentSlug: "report",
      message: "question",
      replyText: "reply",
      agent: { slug: "report", name: "Ivy", role: "reporter", description: "desc" },
    });
  });
});
