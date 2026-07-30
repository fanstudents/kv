import "server-only";
import { logConversationMessage } from "@/lib/support-conversations";
import type { SupportLogReplyPort } from "@/modules/support/log-reply-ports";

export function createLegacySupportLogReplyAdapter(): SupportLogReplyPort {
  return {
    logBotReply(userId, text) {
      return logConversationMessage(userId, "bot", text);
    },
  };
}
