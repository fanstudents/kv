export interface SupportLogReplyRequest {
  userId: string;
  text: string;
}

export type SupportBotReplyWriter = (userId: string, text: string) => Promise<void>;

export type SupportLogReplyResult =
  | { kind: "invalid"; message: "缺少 userId 或 text" }
  | { kind: "provider-failed"; message: string }
  | { kind: "ok" };

export function parseSupportLogReplyRequest(payload: unknown): SupportLogReplyRequest {
  const body =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return {
    userId: typeof body.userId === "string" ? body.userId : "",
    text: typeof body.text === "string" ? body.text : "",
  };
}

export async function recordSupportLogReply(
  input: SupportLogReplyRequest,
  writeBotReply: SupportBotReplyWriter,
): Promise<SupportLogReplyResult> {
  if (!input.userId || !input.text) return { kind: "invalid", message: "缺少 userId 或 text" };

  try {
    await writeBotReply(input.userId, input.text);
    return { kind: "ok" };
  } catch (error) {
    return {
      kind: "provider-failed",
      message: error instanceof Error ? error.message : "寫入失敗",
    };
  }
}
