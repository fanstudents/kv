import {
  classifyVisitDecisionText,
  type LineInboundEvent,
  type VisitDecisionTextIntent,
} from "./line-inbound";
import type { ContactTagPort } from "@/modules/operations/service";
import type { ConversationLockPort } from "@/modules/conversation/lock-ports";
import type { VisitLineActivityPort } from "@/modules/visit/line-activity-ports";
import type { VisitLineDeliveryPort } from "@/modules/visit/line-delivery-ports";
import type { VisitLineWorkflowPersistencePort } from "@/modules/visit/line-workflow-ports";
import type { VisitBusinessCard, VisitCardReplyIntent, VisitProviderPort } from "@/modules/visit/provider-port";
import type { VisitRuntimePort } from "@/modules/visit/runtime-ports";
import type { VisitSettingsPort } from "@/modules/visit/settings-ports";
import type { VisitInviteEmailHtmlBuilder } from "@/modules/visit/line-invite-approval-application";

export interface VisitDecisionCardBuilder {
  (params: { offerId: string; name: string; company?: string }): unknown;
}

export interface VisitTagQuickReplyBuilder {
  (params: { contactId: string; tags: string[] }): unknown;
}

export interface VisitLineOfferDependencies {
  workflow: Pick<
    VisitLineWorkflowPersistencePort,
    "findPendingOffer" | "resolveOffer" | "updateContactField" | "findContact" | "createPendingInvite"
  >;
  delivery: Pick<VisitLineDeliveryPort, "replyText" | "replyMessages">;
  providers: Pick<
    VisitProviderPort,
    "interpretCardReply" | "findFreeSlots" | "draftInviteEmail" | "sendEmail"
  >;
  settings: VisitSettingsPort;
  runtime: Pick<VisitRuntimePort, "reportVisitStep" | "saveVisitArtifact" | "endVisitRun">;
  activity: VisitLineActivityPort;
  lock: ConversationLockPort;
  tags: ContactTagPort;
  formatCardReply: (contact: VisitBusinessCard) => string;
  renderDecisionCard: VisitDecisionCardBuilder;
  renderTagQuickReply: VisitTagQuickReplyBuilder;
  renderInviteEmail: VisitInviteEmailHtmlBuilder;
  classifyDecisionText?: (text: string) => VisitDecisionTextIntent;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createVisitLineOfferReplyHandler(
  dependencies: VisitLineOfferDependencies,
): (event: LineInboundEvent, userId: string, text: string, baseUrl: string) => Promise<boolean> {
  const classifyDecision = dependencies.classifyDecisionText ?? classifyVisitDecisionText;

  return async function handleVisitOfferReply(
    event: LineInboundEvent,
    userId: string,
    text: string,
    baseUrl: string,
  ): Promise<boolean> {
    if (!event.replyToken) return false;

    const offer = await dependencies.workflow.findPendingOffer(userId);
    if (!offer) return false;

    const contact = offer.contact;
    if (!contact) return false;

    let intent: VisitCardReplyIntent;
    try {
      intent = await dependencies.providers.interpretCardReply({
        currentCard: {
          name: contact.name ?? "",
          company: contact.company ?? "",
          title: contact.title ?? "",
          email: contact.email ?? "",
          phone: contact.phone ?? "",
        },
        userText: text,
      });
    } catch {
      // AI 判讀失敗時退回關鍵字比對，至少不會讓使用者完全沒有回應。
      intent = classifyDecision(text);
    }

    if (intent.type === "other") {
      await dependencies.delivery.replyText(
        event.replyToken,
        "不好意思，我沒聽懂 🙏 資訊正確的話請回覆「要」；要修正的話請告訴我欄位與正確的值（例如「公司應該是 XX 科技」）；不需要安排的話請回覆「不要」。",
      );
      return true;
    }

    if (intent.type === "cancel") {
      await dependencies.workflow.resolveOffer(offer.id, "declined", new Date().toISOString());
      await dependencies.runtime.reportVisitStep({
        userId,
        nodeId: "tag",
        step: 2,
        status: "done",
        caption: `已依您的指示，這次不安排（${contact.name}）`,
        detail: "改為標註客戶標籤，流程在此收尾",
      });
      await dependencies.runtime.endVisitRun({
        userId,
        status: "cancelled",
        summary: `${contact.name} 這次不安排拜訪，已改標客戶標籤`,
      });
      const availableTags = await dependencies.tags.list();
      await dependencies.delivery.replyMessages(event.replyToken, [
        { type: "text", text: "好的，這次先不安排，需要的話再傳名片給我一次即可。" },
        dependencies.renderTagQuickReply({ contactId: contact.id, tags: availableTags }),
      ]);
      await dependencies.lock.release(userId, "visit");
      return true;
    }

    if (intent.type === "correction") {
      await dependencies.workflow.updateContactField(contact.id, intent.field, intent.value);
      const updated: VisitBusinessCard = {
        name: intent.field === "name" ? intent.value : contact.name ?? "",
        company: intent.field === "company" ? intent.value : contact.company ?? "",
        title: intent.field === "title" ? intent.value : contact.title ?? "",
        email: intent.field === "email" ? intent.value : contact.email ?? "",
        phone: intent.field === "phone" ? intent.value : contact.phone ?? "",
      };
      await dependencies.delivery.replyText(
        event.replyToken,
        `已更新 ✅\n\n${dependencies.formatCardReply(updated)}\n\n還有其他要修正的嗎？資訊都對的話請回覆「要」。`,
      );
      return true;
    }

    const freshContact = await dependencies.workflow.findContact(contact.id);
    const finalContact = freshContact ?? contact;

    if (!finalContact.email || !EMAIL_RE.test(finalContact.email)) {
      await dependencies.delivery.replyText(
        event.replyToken,
        `目前的 Email（${finalContact.email || "空白"}）看起來格式不太對，麻煩回覆正確的 Email，我才能繼續安排邀約信。`,
      );
      return true;
    }

    await dependencies.workflow.resolveOffer(offer.id, "accepted", new Date().toISOString());

    try {
      await dependencies.runtime.reportVisitStep({
        userId,
        nodeId: "match",
        step: 2,
        status: "active",
        caption: `比對行事曆空檔（${finalContact.name}）`,
        detail: "讀取與行程助理共用的 Google 日曆",
      });
      const settings = await dependencies.settings.get();
      const slots = await dependencies.providers.findFreeSlots({
        rangeStartDays: settings.rangeStartDays,
        rangeEndDays: settings.rangeEndDays,
        workingHoursStart: settings.workingHoursStart,
        workingHoursEnd: settings.workingHoursEnd,
        meetingDurationMinutes: settings.meetingDuration,
        slotCount: 2,
      });

      if (slots.length < 2) {
        await dependencies.delivery.replyText(
          event.replyToken,
          "查了行事曆但接下來找不到足夠的空檔，需要的話請手動與對方協調時間。",
        );
        await dependencies.activity.record({
          agent_slug: "visit",
          summary: `查詢行事曆空檔不足，無法幫 ${finalContact.name} 產生邀約信`,
          status: "failed",
        });
        await dependencies.lock.release(userId, "visit");
        return true;
      }

      const draft = await dependencies.providers.draftInviteEmail({
        contactName: finalContact.name,
        contactTitle: finalContact.title,
        company: finalContact.company,
        meetingType: settings.meetingType,
        slot1: slots[0].label,
        slot2: slots[1].label,
        senderName: settings.senderName,
      });

      const invite = await dependencies.workflow.createPendingInvite(userId, {
        contactId: finalContact.id,
        toEmail: finalContact.email,
        subject: draft.subject,
        body: draft.body,
        slots: [
          { label: slots[0].label, start: slots[0].start, end: slots[0].end },
          { label: slots[1].label, start: slots[1].start, end: slots[1].end },
        ],
        requiresApproval: settings.requireApproval,
      });

      if (settings.requireApproval) {
        await dependencies.runtime.reportVisitStep({
          userId,
          nodeId: "draft",
          step: 3,
          status: "active",
          caption: `邀約信草稿已備妥：${finalContact.name}`,
        });
        await dependencies.delivery.replyText(
          event.replyToken,
          `邀約信草稿已經準備好，寄出前想先讓您過目：\n\n收件人：${finalContact.name}（${finalContact.email}）\n主旨：${draft.subject}\n內文：\n${draft.body}\n\n提議時段：${slots[0].label} 或 ${slots[1].label}\n\n內容 OK 的話請回覆「寄出」，不想寄了請回覆「取消」，想調整的話直接告訴我要怎麼改（例如「語氣正式一點」）。`,
        );
        await dependencies.activity.record({
          agent_slug: "visit",
          summary: `已產生邀約信草稿給 ${finalContact.name}（${finalContact.email}），待使用者核准後才會寄出`,
          status: "pending",
        });
        return true;
      }

      const html = dependencies.renderInviteEmail({
        introText: draft.body,
        senderName: settings.senderName,
        slot1Label: slots[0].label,
        slot2Label: slots[1].label,
        respondUrl1: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=1`,
        respondUrl2: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=2`,
        respondUrlBoth: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=both`,
      });
      await dependencies.runtime.reportVisitStep({
        userId,
        nodeId: "draft",
        step: 3,
        status: "active",
        caption: `寄出邀約信給 ${finalContact.name}…`,
      });
      await dependencies.providers.sendEmail({ to: finalContact.email, subject: draft.subject, body: html, html: true });
      await dependencies.runtime.saveVisitArtifact({
        userId,
        title: `邀約信：${finalContact.name}`,
        content: html,
        meta: { to: finalContact.email, slots: [slots[0].label, slots[1].label] },
      });
      await dependencies.runtime.reportVisitStep({
        userId,
        nodeId: "sent",
        step: 4,
        status: "done",
        caption: `已寄出邀約信給 ${finalContact.name}`,
        detail: `寄至 ${finalContact.email}`,
      });
      await dependencies.runtime.endVisitRun({
        userId,
        status: "success",
        summary: `已寄出邀約信給 ${finalContact.name}`,
      });
      await dependencies.delivery.replyText(
        event.replyToken,
        `已寄出邀約信給 ${finalContact.name}，提議 ${slots[0].label} 或 ${slots[1].label}，等對方選好時段後我會通知您。`,
      );
      await dependencies.activity.record({
        agent_slug: "visit",
        summary: `已寄出邀約信給 ${finalContact.name}（${finalContact.email}），等待對方選擇時段`,
        status: "pending",
      });
      await dependencies.lock.release(userId, "visit");
    } catch (err) {
      const message = err instanceof Error ? err.message : "排程或寄信失敗";
      await dependencies.activity.record({
        agent_slug: "visit",
        summary: `自動排程或寄信失敗：${message}`,
        status: "failed",
      });
      await dependencies.delivery
        .replyText(event.replyToken, "抱歉，自動排程或寄信時遇到問題，請手動與對方聯繫安排時間。")
        .catch(() => {});
      await dependencies.lock.release(userId, "visit");
    }

    return true;
  };
}
