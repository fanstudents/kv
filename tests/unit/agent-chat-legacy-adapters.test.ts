import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAgentLiveContext, replyToChat, buildCanvasForReply } = vi.hoisted(
  () => ({
    getAgentLiveContext: vi.fn(),
    replyToChat: vi.fn(),
    buildCanvasForReply: vi.fn(),
  })
);

vi.mock("server-only", () => ({}));
vi.mock("@/lib/meeting-context", () => ({ getAgentLiveContext }));
vi.mock("@/lib/openai", () => ({ replyToChat }));
vi.mock("@/lib/chat-canvas", () => ({ buildCanvasForReply }));

import { createLegacyAgentChatAdapters } from "@/adapters/agent-chat/legacy-agent-chat-adapters";
import type { AgentChatAgent } from "@/modules/agent-chat/ports";

const reportAgent: AgentChatAgent = {
  slug: "report",
  name: "Ivy 艾薇",
  role: "數據參謀",
  description: "desc",
  isTeamLead: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("legacy Agent chat adapters", () => {
  it("maps the existing catalog identity and Team Lead flag", () => {
    const ports = createLegacyAgentChatAdapters();

    expect(ports.agents.find("report")).toMatchObject({
      slug: "report",
      name: "Ivy 艾薇",
      isTeamLead: false,
    });
    expect(ports.agents.find("teamlead")).toMatchObject({
      slug: "teamlead",
      name: "Vivian 薇薇安",
      isTeamLead: true,
    });
    expect(ports.agents.find("missing")).toBeNull();
  });

  it("delegates context loading without changing its arguments", async () => {
    getAgentLiveContext.mockResolvedValue("context");
    const ports = createLegacyAgentChatAdapters();

    await expect(ports.context.load("report", "question")).resolves.toBe("context");
    expect(getAgentLiveContext).toHaveBeenCalledWith("report", "question");
  });

  it("maps the reply request to the existing OpenAI helper", async () => {
    replyToChat.mockResolvedValue("reply");
    const ports = createLegacyAgentChatAdapters();

    await expect(
      ports.replies.generate({
        agent: reportAgent,
        message: "question",
        liveContext: "context",
        history: "history",
      })
    ).resolves.toBe("reply");
    expect(replyToChat).toHaveBeenCalledWith({
      agent: {
        slug: "report",
        name: "Ivy 艾薇",
        role: "數據參謀",
        description: "desc",
      },
      message: "question",
      liveContext: "context",
      history: "history",
      isTeamLead: false,
    });
  });

  it("maps the canvas request to the existing best-effort helper", async () => {
    const canvas = { kind: "action-plan", title: "plan", items: [] };
    buildCanvasForReply.mockResolvedValue(canvas);
    const ports = createLegacyAgentChatAdapters();

    await expect(
      ports.canvas.build({
        agent: reportAgent,
        message: "question",
        replyText: "reply",
      })
    ).resolves.toBe(canvas);
    expect(buildCanvasForReply).toHaveBeenCalledWith({
      agentSlug: "report",
      message: "question",
      replyText: "reply",
      agent: {
        slug: "report",
        name: "Ivy 艾薇",
        role: "數據參謀",
        description: "desc",
      },
    });
  });
});
