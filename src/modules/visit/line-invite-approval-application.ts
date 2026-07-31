import {
  classifyVisitApprovalText,
  type LineInboundEvent,
  type VisitApprovalTextIntent,
} from "./line-inbound";
import type { ConversationLockPort } from "@/modules/conversation/lock-ports";
import type { VisitLineActivityPort } from "@/modules/visit/line-activity-ports";
import type { VisitLineDeliveryPort } from "@/modules/visit/line-delivery-ports";
import type { VisitLineWorkflowPersistencePort } from "@/modules/visit/line-workflow-ports";
import type { VisitRuntimePort } from "@/modules/visit/runtime-ports";
import type { VisitSettingsPort } from "@/modules/visit/settings-ports";
import type { VisitProviderPort } from "@/modules/visit/provider-port";

export interface VisitInviteEmailHtmlBuilder {
  (params: {
    introText: string;
    senderName: string;
    slot1Label: string;
    slot2Label: string;
    respondUrl1: string;
    respondUrl2: string;
    respondUrlBoth: string;
  }): string;
}

export interface VisitLineInviteApprovalDependencies {
  workflow: Pick<
    VisitLineWorkflowPersistencePort,
    "findPendingApprovalInvite" | "updateInviteStatus" | "updateInviteDraft"
  >;
  delivery: Pick<VisitLineDeliveryPort, "replyText">;
  providers: Pick<VisitProviderPort, "reviseInviteEmail" | "sendEmail">;
  settings: VisitSettingsPort;
  runtime: Pick<VisitRuntimePort, "reportVisitStep" | "saveVisitArtifact" | "endVisitRun">;
  activity: VisitLineActivityPort;
  lock: ConversationLockPort;
  renderInviteEmail: VisitInviteEmailHtmlBuilder;
  classifyApprovalText?: (text: string) => VisitApprovalTextIntent;
}

export function createVisitLineInviteApprovalHandler(
  dependencies: VisitLineInviteApprovalDependencies,
): (event: LineInboundEvent, userId: string, text: string, baseUrl: string) => Promise<boolean> {
  const classifyApproval = dependencies.classifyApprovalText ?? classifyVisitApprovalText;

  return async function handleInviteApprovalReply(
    event: LineInboundEvent,
    userId: string,
    text: string,
    baseUrl: string,
  ): Promise<boolean> {
    if (!event.replyToken) return false;

    const invite = await dependencies.workflow.findPendingApprovalInvite(userId);
    if (!invite) return false;

    const contact = invite.contact;
    if (!contact) return false;

    const approvalIntent = classifyApproval(text);

    if (approvalIntent.type === "cancel") {
      await dependencies.workflow.updateInviteStatus(invite.id, "cancelled");
      await dependencies.delivery.replyText(event.replyToken, "好的，已取消，不會寄出這封信。");
      await dependencies.lock.release(userId, "visit");
      return true;
    }

    if (approvalIntent.type === "send") {
      try {
        const html = dependencies.renderInviteEmail({
          introText: invite.body,
          senderName: (await dependencies.settings.get()).senderName,
          slot1Label: invite.slot1,
          slot2Label: invite.slot2,
          respondUrl1: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=1`,
          respondUrl2: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=2`,
          respondUrlBoth: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=both`,
        });
        await dependencies.runtime.reportVisitStep({
          userId,
          nodeId: "draft",
          step: 3,
          status: "active",
          caption: `寄出邀約信給 ${contact.name}…`,
        });
        await dependencies.providers.sendEmail({ to: contact.email, subject: invite.subject, body: html, html: true });
        await dependencies.workflow.updateInviteStatus(invite.id, "pending");
        await dependencies.runtime.saveVisitArtifact({
          userId,
          title: `邀約信：${contact.name}`,
          content: html,
          meta: { to: contact.email, slots: [invite.slot1, invite.slot2] },
        });
        await dependencies.runtime.reportVisitStep({
          userId,
          nodeId: "sent",
          step: 4,
          status: "done",
          caption: `已寄出邀約信給 ${contact.name}`,
          detail: `寄至 ${contact.email}`,
        });
        await dependencies.runtime.endVisitRun({
          userId,
          status: "success",
          summary: `已寄出邀約信給 ${contact.name}`,
        });
        await dependencies.delivery.replyText(
          event.replyToken,
          `已寄出邀約信給 ${contact.name}，提議 ${invite.slot1} 或 ${invite.slot2}，等對方選好時段後我會通知您。`,
        );
        await dependencies.activity.record({
          agent_slug: "visit",
          summary: `使用者核准後已寄出邀約信給 ${contact.name}（${contact.email}），等待對方選擇時段`,
          status: "pending",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "寄信失敗";
        await dependencies.workflow.updateInviteStatus(invite.id, "failed");
        await dependencies.activity.record({
          agent_slug: "visit",
          summary: `核准後寄信失敗：${message}`,
          status: "failed",
        });
        await dependencies.delivery
          .replyText(event.replyToken, "抱歉，寄信時遇到問題，請手動與對方聯繫安排時間。")
          .catch(() => {});
      }
      await dependencies.lock.release(userId, "visit");
      return true;
    }

    try {
      const settings = await dependencies.settings.get();
      const revised = await dependencies.providers.reviseInviteEmail({
        contactName: contact.name,
        contactTitle: contact.title,
        company: contact.company,
        meetingType: settings.meetingType,
        senderName: settings.senderName,
        previousSubject: invite.subject,
        previousBody: invite.body,
        instruction: text,
      });
      await dependencies.workflow.updateInviteDraft(invite.id, revised.subject, revised.body);
      await dependencies.delivery.replyText(
        event.replyToken,
        `已依您的要求調整 ✏️\n\n主旨：${revised.subject}\n內文：\n${revised.body}\n\n提議時段：${invite.slot1} 或 ${invite.slot2}\n\n這樣可以的話請回覆「寄出」，還要調整請繼續告訴我，不寄了請回覆「取消」。`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "修改邀約信失敗";
      await dependencies.activity.record({
        agent_slug: "visit",
        summary: `依使用者要求修改邀約信失敗：${message}`,
        status: "failed",
      });
      await dependencies.delivery
        .replyText(event.replyToken, "抱歉，剛剛調整內容時遇到問題，可以再說一次要怎麼修改嗎？")
        .catch(() => {});
    }

    return true;
  };
}
