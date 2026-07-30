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
