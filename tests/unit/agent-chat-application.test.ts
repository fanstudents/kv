import { describe, expect, it, vi } from "vitest";
import { runAgentChat } from "@/modules/agent-chat/application";
import type {
  AgentChatAgent,
  AgentChatPorts,
} from "@/modules/agent-chat/ports";

const agent: AgentChatAgent = {
  slug: "report",
  name: "Ivy 艾薇",
  role: "數據參謀",
  description: "desc",
  isTeamLead: false,
};

function createPorts(): AgentChatPorts {
  return {
    agents: { find: vi.fn(() => agent) },
    context: { load: vi.fn(async () => "context") },
    replies: { generate: vi.fn(async () => "reply") },
    canvas: {
      build: vi.fn(async () => ({
        kind: "action-plan",
        title: "plan",
        items: [],
      })),
    },
  };
}

const input = {
  agentSlug: "report",
  message: "question",
  history: "history",
};

describe("Agent chat application", () => {
  it("stops before providers when the Agent does not exist", async () => {
    const ports = createPorts();
    vi.mocked(ports.agents.find).mockReturnValue(null);

    await expect(runAgentChat(input, ports)).resolves.toEqual({
      kind: "agent-not-found",
    });
    expect(ports.context.load).not.toHaveBeenCalled();
    expect(ports.replies.generate).not.toHaveBeenCalled();
    expect(ports.canvas.build).not.toHaveBeenCalled();
  });

  it("loads context, generates the reply, and enriches the canvas", async () => {
    const ports = createPorts();

    await expect(runAgentChat(input, ports)).resolves.toEqual({
      kind: "ok",
      reply: "reply",
      canvas: { kind: "action-plan", title: "plan", items: [] },
    });
    expect(ports.context.load).toHaveBeenCalledWith("report", "question");
    expect(ports.replies.generate).toHaveBeenCalledWith({
      agent,
      message: "question",
      liveContext: "context",
      history: "history",
    });
    expect(ports.canvas.build).toHaveBeenCalledWith({
      agent,
      message: "question",
      replyText: "reply",
    });
  });

  it("isolates context failure and still generates the reply", async () => {
    const ports = createPorts();
    vi.mocked(ports.context.load).mockRejectedValue(new Error("unavailable"));

    await expect(runAgentChat(input, ports)).resolves.toMatchObject({
      kind: "ok",
      reply: "reply",
    });
    expect(ports.replies.generate).toHaveBeenCalledWith(
      expect.objectContaining({ liveContext: "" })
    );
  });

  it("returns the existing reply-provider failure result and skips canvas", async () => {
    const ports = createPorts();
    vi.mocked(ports.replies.generate).mockRejectedValue(new Error("provider down"));

    await expect(runAgentChat(input, ports)).resolves.toEqual({
      kind: "reply-failed",
      message: "provider down",
    });
    expect(ports.canvas.build).not.toHaveBeenCalled();
  });

  it("uses the generic reply error for non-Error failures", async () => {
    const ports = createPorts();
    vi.mocked(ports.replies.generate).mockRejectedValue("failed");

    await expect(runAgentChat(input, ports)).resolves.toEqual({
      kind: "reply-failed",
      message: "回覆失敗",
    });
  });

  it("isolates canvas failure without changing the reply", async () => {
    const ports = createPorts();
    vi.mocked(ports.canvas.build).mockRejectedValue(new Error("canvas down"));

    await expect(runAgentChat(input, ports)).resolves.toEqual({
      kind: "ok",
      reply: "reply",
      canvas: null,
    });
  });

  it("applies the exact fallback after an empty generated reply", async () => {
    const ports = createPorts();
    vi.mocked(ports.replies.generate).mockResolvedValue("");

    await expect(runAgentChat(input, ports)).resolves.toMatchObject({
      kind: "ok",
      reply: "收到，我確認後回覆您。",
    });
    expect(ports.canvas.build).toHaveBeenCalledWith(
      expect.objectContaining({ replyText: "" })
    );
  });
});
