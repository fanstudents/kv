export interface AgentChatRequest {
  agentSlug: string;
  message: string;
  history: string;
}

const EMPTY_REPLY_FALLBACK = "收到，我確認後回覆您。";

export function parseAgentChatRequest(payload: unknown): AgentChatRequest | null {
  const body =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  const agentSlug = typeof body.agentSlug === "string" ? body.agentSlug : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const history = typeof body.history === "string" ? body.history : "";

  if (!agentSlug || !message) return null;
  return { agentSlug, message, history };
}

export function withAgentChatReplyFallback(text: string): string {
  return text || EMPTY_REPLY_FALLBACK;
}

export interface AgentChatAgent {
  slug: string;
  name: string;
  role: string;
  description: string;
  isTeamLead: boolean;
}

export interface AgentChatReplyInput {
  agent: AgentChatAgent;
  message: string;
  liveContext: string;
  history: string;
}

export interface AgentChatCanvasInput {
  agent: AgentChatAgent;
  message: string;
  replyText: string;
}

export interface AgentChatPorts {
  agents: { find(slug: string): AgentChatAgent | null };
  context: { load(agentSlug: string, question: string): Promise<string> };
  replies: { generate(input: AgentChatReplyInput): Promise<string> };
  canvas: { build(input: AgentChatCanvasInput): Promise<unknown | null> };
}

export type AgentChatResult =
  | { kind: "agent-not-found" }
  | { kind: "reply-failed"; message: string }
  | { kind: "ok"; reply: string; canvas: unknown | null };

export async function runAgentChat(
  input: AgentChatRequest,
  ports: AgentChatPorts
): Promise<AgentChatResult> {
  const agent = ports.agents.find(input.agentSlug);
  if (!agent) return { kind: "agent-not-found" };

  let liveContext = "";
  try {
    liveContext = await ports.context.load(input.agentSlug, input.message);
  } catch {
    // Missing live context must not block the reply.
  }

  let text: string;
  try {
    text = await ports.replies.generate({
      agent,
      message: input.message,
      liveContext,
      history: input.history,
    });
  } catch (error) {
    return {
      kind: "reply-failed",
      message: error instanceof Error ? error.message : "回覆失敗",
    };
  }

  let canvas: unknown | null = null;
  try {
    canvas = await ports.canvas.build({
      agent,
      message: input.message,
      replyText: text,
    });
  } catch {
    // Canvas enrichment is best-effort.
  }

  return {
    kind: "ok",
    reply: withAgentChatReplyFallback(text),
    canvas,
  };
}
