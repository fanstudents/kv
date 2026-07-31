import "server-only";

import { pushLineMessage, replyLineMessage, replyLineRawMessages } from "@/lib/line";
import type { VisitLineDeliveryPort } from "@/modules/visit/line-delivery-ports";

export function createLegacyVisitLineDeliveryAdapter(): VisitLineDeliveryPort {
  return {
    async replyText(replyToken, text) {
      await replyLineMessage(replyToken, text);
    },
    async replyMessages(replyToken, messages) {
      await replyLineRawMessages(replyToken, messages);
    },
    async pushText(lineUserId, text) {
      await pushLineMessage(lineUserId, text);
    },
  };
}
