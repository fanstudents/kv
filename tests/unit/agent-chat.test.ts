import { describe, expect, it, vi } from "vitest";
import {
  parseAgentChatRequest,
  runAgentChat,
  withAgentChatReplyFallback,
  type AgentChatAgent,
  type AgentChatPorts,
} from "@/modules/agent-chat/chat";

const agent: AgentChatAgent = {
  slug: "report",
  name: "Ivy",
  role: "reporter",
  description: "desc",
  isTeamLead: false,
};

function createPorts(): AgentChatPorts {
  return {
    agents: { find: vi.fn(() => agent) },
    context: { load: vi.fn(async () => "context") },
    replies: { generate: vi.fn(async () => "reply") },
    canvas: { build: vi.fn(async () => ({ kind: "action-plan", title: "plan", items: [] })) },
  };
}

const input = { agentSlug: "report", message: "question", history: "history" };

describe("Agent chat capability", () => {
  it("keeps request parsing, untrimmed slug behavior, and reply fallback", () => {
    expect(parseAgentChatRequest({ agentSlug: " report ", message: "  hello  ", history: "old" })).toEqual({
      agentSlug: " report ",
      message: "hello",
      history: "old",
    });
    expect(parseAgentChatRequest({ agentSlug: "report", message: "hello", history: ["old"] })).toEqual({
      agentSlug: "report",
      message: "hello",
      history: "",
    });
    expect(parseAgentChatRequest({ agentSlug: "report", message: "   " })).toBeNull();
    expect(parseAgentChatRequest(null)).toBeNull();
    expect(withAgentChatReplyFallback("reply")).toBe("reply");
    expect(withAgentChatReplyFallback("")).toBe("收到，我確認後回覆您。");
  });

  it.each([
    null,
    {},
    { agentSlug: "", message: "hello" },
    { agentSlug: "report", message: "" },
    { agentSlug: "report", message: "   " },
    { agentSlug: 1, message: "hello" },
    { agentSlug: "report", message: 1 },
  ])("rejects every existing invalid request shape %#", (payload) => {
    expect(parseAgentChatRequest(payload)).toBeNull();
  });

  it("keeps agent lookup, context, reply, and canvas sequencing", async () => {
    const ports = createPorts();

    await expect(runAgentChat(input, ports)).resolves.toEqual({
      kind: "ok",
      reply: "reply",
      canvas: { kind: "action-plan", title: "plan", items: [] },
    });
    expect(ports.context.load).toHaveBeenCalledWith("report", "question");
    expect(ports.replies.generate).toHaveBeenCalledWith({ agent, message: "question", liveContext: "context", history: "history" });
    expect(ports.canvas.build).toHaveBeenCalledWith({ agent, message: "question", replyText: "reply" });
  });

  it("keeps context/canvas as best-effort enrichment", async () => {
    const ports = createPorts();
    vi.mocked(ports.context.load).mockRejectedValue(new Error("unavailable"));
    vi.mocked(ports.canvas.build).mockRejectedValue(new Error("canvas down"));
    vi.mocked(ports.replies.generate).mockResolvedValue("");

    await expect(runAgentChat(input, ports)).resolves.toEqual({
      kind: "ok",
      reply: "收到，我確認後回覆您。",
      canvas: null,
    });
    expect(ports.replies.generate).toHaveBeenCalledWith(expect.objectContaining({ liveContext: "" }));
    expect(ports.canvas.build).toHaveBeenCalledWith(expect.objectContaining({ replyText: "" }));
  });

  it("keeps context failure isolated before a normal reply", async () => {
    const ports = createPorts();
    vi.mocked(ports.context.load).mockRejectedValue(new Error("unavailable"));

    await expect(runAgentChat(input, ports)).resolves.toMatchObject({ kind: "ok", reply: "reply" });
    expect(ports.replies.generate).toHaveBeenCalledWith(expect.objectContaining({ liveContext: "" }));
  });

  it("keeps unknown-agent and reply-provider failure boundaries", async () => {
    const unknown = createPorts();
    vi.mocked(unknown.agents.find).mockReturnValue(null);
    await expect(runAgentChat(input, unknown)).resolves.toEqual({ kind: "agent-not-found" });
    expect(unknown.context.load).not.toHaveBeenCalled();

    const failed = createPorts();
    vi.mocked(failed.replies.generate).mockRejectedValue("failed");
    await expect(runAgentChat(input, failed)).resolves.toEqual({ kind: "reply-failed", message: "回覆失敗" });
    expect(failed.canvas.build).not.toHaveBeenCalled();
  });

  it("keeps a reply provider Error message and skips canvas", async () => {
    const ports = createPorts();
    vi.mocked(ports.replies.generate).mockRejectedValue(new Error("provider down"));

    await expect(runAgentChat(input, ports)).resolves.toEqual({ kind: "reply-failed", message: "provider down" });
    expect(ports.canvas.build).not.toHaveBeenCalled();
  });
});
