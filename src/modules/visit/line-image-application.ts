import type { ContactTagPort } from "@/modules/contacts/tag-ports";
import type { ConversationLockPort } from "@/modules/conversation/lock-ports";
import type { VisitLineActivityPort } from "@/modules/visit/line-activity-ports";
import type { VisitLineCardPersistencePort } from "@/modules/visit/line-card-ports";
import type { VisitLineDeliveryPort } from "@/modules/visit/line-delivery-ports";
import type { LineInboundEvent } from "@/modules/visit/line-inbound";
import type { VisitLineImagePort } from "@/modules/visit/line-image-ports";
import type { VisitRuntimePort } from "@/modules/visit/runtime-ports";
import type { VisitBusinessCard } from "@/modules/visit/provider-port";

export interface VisitDecisionCardBuilder {
  (params: { offerId: string; name: string; company?: string }): unknown;
}

export interface VisitTagQuickReplyBuilder {
  (params: { contactId: string; tags: string[] }): unknown;
}

export interface VisitLineImageDependencies {
  image: VisitLineImagePort;
  delivery: Pick<VisitLineDeliveryPort, "replyText" | "replyMessages">;
  workflow: VisitLineCardPersistencePort;
  tags: ContactTagPort;
  activity: VisitLineActivityPort;
  lock: ConversationLockPort;
  runtime: Pick<VisitRuntimePort, "startVisitRun" | "reportVisitStep" | "endVisitRun">;
  formatCardReply: (contact: VisitBusinessCard) => string;
  renderDecisionCard: VisitDecisionCardBuilder;
  renderTagQuickReply: VisitTagQuickReplyBuilder;
  agentSlug?: string;
}

export function createVisitLineImageHandler(
  dependencies: VisitLineImageDependencies,
): (event: LineInboundEvent, userId: string) => Promise<void> {
  const agentSlug = dependencies.agentSlug ?? "visit";

  return async function handleImageMessage(event: LineInboundEvent, userId: string): Promise<void> {
    const messageId = event.message?.id;
    const replyToken = event.replyToken;
    if (!messageId || !replyToken) return;

    let contact: VisitBusinessCard;
    try {
      const imageDataUrl = await dependencies.image.getImageDataUrl(messageId);
      if (!imageDataUrl.startsWith("data:image/")) {
        await dependencies.delivery.replyText(replyToken, "這個檔案不是圖片格式，請直接傳名片照片給我。");
        return;
      }

      // 一張名片＝一次執行。messageId 當冪等鍵：LINE webhook 重送不會變成第二次執行。
      await dependencies.runtime.startVisitRun({ userId, messageId, summary: "LINE 傳入名片，開始辨識" });
      // 劇院螢幕：名片一進來就進入「辨識中」，並帶上真實照片。
      await dependencies.runtime.reportVisitStep({
        userId,
        nodeId: "scan",
        step: 0,
        status: "active",
        caption: "辨識名片中…",
        image: imageDataUrl,
      });
      contact = await dependencies.image.parseBusinessCard(imageDataUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "名片辨識失敗";
      await dependencies.activity.record({
        agent_slug: agentSlug,
        summary: `LINE 名片辨識失敗：${message}（來自 ${userId}）`,
        status: "failed",
      });
      await dependencies.runtime.endVisitRun({
        userId,
        status: "failed",
        summary: `名片辨識失敗：${message}`,
        errorDetail: message,
      });
      await dependencies.delivery
        .replyText(replyToken, "抱歉，名片辨識過程發生問題，請稍後再傳一次試試。")
        .catch(() => {});
      return;
    }

    const recognized = Boolean(contact.name || contact.company || contact.email);
    await dependencies.activity.record({
      agent_slug: agentSlug,
      summary: recognized
        ? `透過 LINE 辨識名片：${contact.name || "（未辨識出姓名）"}${
            contact.company ? ` / ${contact.company}` : ""
          }（來自 ${userId}）`
        : `收到 ${userId} 的圖片，但未辨識出名片資訊`,
      status: recognized ? "success" : "pending",
    });

    const replyText = dependencies.formatCardReply(contact);

    if (!recognized) {
      await dependencies.runtime.reportVisitStep({
        userId,
        nodeId: "scan",
        step: 0,
        status: "active",
        caption: "未辨識出名片資訊",
      });
      await dependencies.runtime.endVisitRun({ userId, status: "failed", summary: "圖片中未辨識出名片資訊" });
      await dependencies.delivery.replyText(replyToken, replyText);
      return;
    }

    // 辨識成功 → 寫入聯絡人（辨識✓ 寫入✓），暫停等你回覆「要／不要」。
    // 辨識完就等於「寫入聯絡人」也走完了，兩步都記下來（畫面上會依序打勾）。
    await dependencies.runtime.reportVisitStep({
      userId,
      nodeId: "write",
      step: 1,
      status: "active",
      caption: `寫入聯絡人：${contact.name || "（未命名）"}`,
      detail: [contact.company, contact.title, contact.email].filter(Boolean).join(" / "),
    });
    await dependencies.runtime.reportVisitStep({
      userId,
      nodeId: "confirm",
      step: 2,
      status: "waiting",
      caption: `${contact.name || "名片"}${contact.company ? ` · ${contact.company}` : ""}`,
      detail: "等待指揮官回覆要不要安排拜訪",
    });

    // 多輪對話即將開始，先搶下這個使用者的鎖（同一 Agent 重入會自動延長，不會卡住自己）。
    await dependencies.lock.acquire(userId, agentSlug, { context: { stage: "card_review" } });

    const contactRow = await dependencies.workflow.createContact(contact, userId);

    if (!contact.email) {
      // 沒 Email → 不安排邀約，但仍可幫你標籤分類。
      const availableTags = await dependencies.tags.list();
      const noEmailMessages: unknown[] = [
        {
          type: "text",
          text: `${replyText}\n\n這張名片沒有 Email，暫時無法自動安排拜訪邀約，需要的話可以手動聯繫對方。`,
        },
      ];
      if (contactRow?.id) {
        noEmailMessages.push(dependencies.renderTagQuickReply({ contactId: contactRow.id, tags: availableTags }));
      }
      await dependencies.delivery.replyMessages(replyToken, noEmailMessages);
      await dependencies.lock.release(userId, agentSlug);
      return;
    }

    const offerRow = await dependencies.workflow.createOffer(userId, contactRow?.id);

    // 回覆：辨識資訊 +「要／不要」卡片。標籤選單不在這裡一起跳出——避免兩張卡片
    // 同時出現造成混淆；等使用者做完「要／不要」決定後，才接續出現標籤選單。
    const messages: unknown[] = [
      {
        type: "text",
        text: `${replyText}\n\n有欄位不對就直接回覆修正（例如「Email 應該是 abc@xyz.com」），我會更新後再問一次。`,
      },
    ];
    if (offerRow?.id) {
      messages.push(
        dependencies.renderDecisionCard({
          offerId: offerRow.id,
          name: contact.name || "這位客戶",
          company: contact.company,
        }),
      );
    }
    await dependencies.delivery.replyMessages(replyToken, messages);
  };
}
