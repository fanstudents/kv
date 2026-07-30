import type { AgentChatPorts } from "./ports";
import { withAgentChatReplyFallback, type AgentChatRequest } from "./rules";

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
    // Existing behavior: missing live context must not block the reply.
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
    // Existing behavior: canvas enrichment is best-effort.
  }

  return {
    kind: "ok",
    reply: withAgentChatReplyFallback(text),
    canvas,
  };
}
