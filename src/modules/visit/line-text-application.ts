import type { VisitLineActivityPort, VisitLineDeliveryPort } from "@/modules/visit/line-contracts";
import type { LineInboundEvent } from "@/modules/visit/line-inbound";

export type VisitLineTextHandler = (
  event: LineInboundEvent,
  userId: string,
  text: string,
  baseUrl: string,
) => Promise<boolean>;

export interface VisitLineTextDependencies {
  handleInviteApprovalReply: VisitLineTextHandler;
  handleVisitOfferReply: VisitLineTextHandler;
  delivery: Pick<VisitLineDeliveryPort, "replyText">;
  activity: VisitLineActivityPort;
}

export function createVisitLineTextHandler(
  dependencies: VisitLineTextDependencies,
): (event: LineInboundEvent, userId: string, baseUrl: string) => Promise<void> {
  return async function handleTextMessage(
    event: LineInboundEvent,
    userId: string,
    baseUrl: string,
  ): Promise<void> {
    if (!event.replyToken) return;

    const text = (event.message?.text ?? "").trim();

    const handledApproval = await dependencies.handleInviteApprovalReply(event, userId, text, baseUrl);
    if (handledApproval) return;

    const handledOffer = await dependencies.handleVisitOfferReply(event, userId, text, baseUrl);
    if (handledOffer) return;

    try {
      await dependencies.delivery.replyText(
        event.replyToken,
        "已收到您的訊息！目前我最擅長的是名片辨識——直接傳一張名片照片給我，我會自動整理出聯絡資訊，並視需要幫您安排拜訪邀約。",
      );
      await dependencies.activity.record({
        agent_slug: null,
        summary: `收到來自 ${userId} 的訊息：「${event.message?.text?.slice(0, 40)}」，已自動回覆`,
        status: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "回覆失敗";
      await dependencies.activity.record({
        agent_slug: null,
        summary: `回覆來自 ${userId} 的訊息失敗：${message}`,
        status: "failed",
      });
    }
  };
}
