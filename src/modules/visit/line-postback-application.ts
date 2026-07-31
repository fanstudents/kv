import type { ContactTagPort } from "@/modules/contacts/tag-ports";
import type { VisitLineDeliveryPort } from "@/modules/visit/line-delivery-ports";
import type { LineInboundEvent } from "@/modules/visit/line-inbound";

export type VisitLinePostbackOfferHandler = (
  event: LineInboundEvent,
  userId: string,
  text: string,
  baseUrl: string,
) => Promise<boolean>;

export interface VisitLinePostbackDependencies {
  handleVisitOfferReply: VisitLinePostbackOfferHandler;
  tags: Pick<ContactTagPort, "add">;
  delivery: Pick<VisitLineDeliveryPort, "replyText">;
}

export function createVisitLinePostbackHandler(
  dependencies: VisitLinePostbackDependencies,
): (event: LineInboundEvent, userId: string, baseUrl: string) => Promise<void> {
  return async function handlePostback(
    event: LineInboundEvent,
    userId: string,
    baseUrl: string,
  ): Promise<void> {
    if (!event.replyToken) return;

    const params = new URLSearchParams(event.postback?.data ?? "");
    const action = params.get("action");

    if (action === "confirm") {
      await dependencies.handleVisitOfferReply(event, userId, "要", baseUrl);
      return;
    }
    if (action === "cancel") {
      await dependencies.handleVisitOfferReply(event, userId, "不要", baseUrl);
      return;
    }
    if (action === "tag") {
      const contactId = params.get("contact");
      const value = params.get("value");
      if (contactId && value) {
        const tags = await dependencies.tags.add(contactId, value);
        await dependencies.delivery.replyText(
          event.replyToken,
          `已標上「${value}」✅${tags.length ? `\n目前標籤：${tags.join("、")}` : ""}`,
        );
      }
      return;
    }
    if (action === "tag_done") {
      await dependencies.delivery.replyText(event.replyToken, "好的，標籤完成 👍 有需要再傳名片給我。");
      return;
    }
  };
}
