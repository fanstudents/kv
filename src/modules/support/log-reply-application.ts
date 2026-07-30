import type { SupportLogReplyPort } from "./log-reply-ports";
import type { SupportLogReplyRequest } from "./log-reply-rules";

export type SupportLogReplyResult =
  | { kind: "invalid"; message: "缺少 userId 或 text" }
  | { kind: "provider-failed"; message: string }
  | { kind: "ok" };

export async function runSupportLogReply(
  input: SupportLogReplyRequest,
  port: SupportLogReplyPort,
): Promise<SupportLogReplyResult> {
  if (!input.userId || !input.text) return { kind: "invalid", message: "缺少 userId 或 text" };

  try {
    await port.logBotReply(input.userId, input.text);
    return { kind: "ok" };
  } catch (error) {
    return {
      kind: "provider-failed",
      message: error instanceof Error ? error.message : "寫入失敗",
    };
  }
}
