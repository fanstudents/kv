import { NextRequest, NextResponse } from "next/server";
import {
  verifyLineSignature,
} from "@/lib/line";
import { buildDecisionCard, buildTagQuickReply } from "@/lib/visit-line-ui";
import { buildInviteEmailHtml } from "@/lib/email-templates";
import {
  parseVisitLineWebhookPayload,
  type LineInboundEvent,
} from "@/modules/visit/line-inbound";
import { dispatchVisitLineWebhookEvents } from "@/modules/visit/line-webhook-application";
import { createVisitLineImageHandler } from "@/modules/visit/line-image-application";
import { createVisitLineInviteApprovalHandler } from "@/modules/visit/line-invite-approval-application";
import { createVisitLineOfferReplyHandler } from "@/modules/visit/line-offer-application";
import type { VisitBusinessCard } from "@/modules/visit/provider-port";
import { legacyVisitProviders } from "@/adapters/visit/legacy-provider-adapter";
import { createLegacyVisitLineImageAdapter } from "@/adapters/visit/legacy-line-image-adapter";
import { createLegacyVisitLineDeliveryAdapter } from "@/adapters/visit/legacy-line-delivery-adapter";
import { createLegacySubscriberTouchAdapter } from "@/adapters/subscribers/legacy-touch-adapter";
import { createLegacyVisitLineCardAdapter } from "@/adapters/visit/legacy-line-card-adapter";
import { createLegacyVisitLineActivityAdapter } from "@/adapters/visit/legacy-line-activity-adapter";
import { createLegacyConversationLockAdapter } from "@/adapters/conversation/legacy-lock-adapter";
import { createLegacyContactTagAdapter } from "@/adapters/contacts/legacy-tag-adapter";
import { createLegacyVisitLineWorkflowAdapter } from "@/adapters/visit/legacy-line-workflow-adapter";
import { createLegacyVisitSettingsAdapter } from "@/adapters/visit/legacy-settings-adapter";
import { createLegacyVisitRuntimeAdapter } from "@/adapters/visit/legacy-runtime-adapter";

const lineImagePort = createLegacyVisitLineImageAdapter();
const lineDeliveryPort = createLegacyVisitLineDeliveryAdapter();
const subscriberTouchPort = createLegacySubscriberTouchAdapter();
const lineCardPersistencePort = createLegacyVisitLineCardAdapter();
const lineActivityPort = createLegacyVisitLineActivityAdapter();
const conversationLockPort = createLegacyConversationLockAdapter();
const contactTagPort = createLegacyContactTagAdapter();
const lineWorkflowPersistencePort = createLegacyVisitLineWorkflowAdapter();
const visitSettingsPort = createLegacyVisitSettingsAdapter();
const { endVisitRun, reportVisitStep, saveVisitArtifact, startVisitRun } = createLegacyVisitRuntimeAdapter();
const handleInviteApprovalReply = createVisitLineInviteApprovalHandler({
  workflow: lineWorkflowPersistencePort,
  delivery: lineDeliveryPort,
  providers: { reviseInviteEmail: legacyVisitProviders.reviseInviteEmail, sendEmail: legacyVisitProviders.sendEmail },
  settings: visitSettingsPort,
  runtime: { reportVisitStep, saveVisitArtifact, endVisitRun },
  activity: lineActivityPort,
  lock: conversationLockPort,
  renderInviteEmail: buildInviteEmailHtml,
});
const handleVisitOfferReply = createVisitLineOfferReplyHandler({
  workflow: lineWorkflowPersistencePort,
  delivery: lineDeliveryPort,
  providers: legacyVisitProviders,
  settings: visitSettingsPort,
  runtime: { reportVisitStep, saveVisitArtifact, endVisitRun },
  activity: lineActivityPort,
  lock: conversationLockPort,
  tags: contactTagPort,
  formatCardReply,
  renderDecisionCard: buildDecisionCard,
  renderTagQuickReply: buildTagQuickReply,
  renderInviteEmail: buildInviteEmailHtml,
});

export async function GET() {
  return NextResponse.json({ ok: true, service: "line-agent-console webhook" });
}

type LineEvent = LineInboundEvent;

function formatCardReply(contact: VisitBusinessCard): string {
  const fields = [
    ["姓名", contact.name],
    ["公司", contact.company],
    ["職稱", contact.title],
    ["Email", contact.email],
    ["電話", contact.phone],
  ] as const;

  const recognized = fields.filter(([, value]) => value);
  if (recognized.length === 0) {
    return "這張圖片看起來不太像名片，或是影像太模糊，沒有辨識出聯絡資訊。可以再拍清楚一點傳給我試試。";
  }

  const lines = recognized.map(([label, value]) => `${label}：${value}`);
  return `名片辨識完成 ✅\n\n${lines.join("\n")}`;
}

const handleImageMessage = createVisitLineImageHandler({
  image: lineImagePort,
  delivery: lineDeliveryPort,
  workflow: lineCardPersistencePort,
  tags: contactTagPort,
  activity: lineActivityPort,
  lock: conversationLockPort,
  runtime: { startVisitRun, reportVisitStep, endVisitRun },
  formatCardReply,
  renderDecisionCard: buildDecisionCard,
  renderTagQuickReply: buildTagQuickReply,
});

/** 使用者點了 Flex 卡片按鈕或標籤選單（postback）。 */
async function handlePostback(event: LineEvent, userId: string, baseUrl: string) {
  if (!event.replyToken) return;
  const params = new URLSearchParams(event.postback?.data ?? "");
  const action = params.get("action");

  if (action === "confirm") {
    await handleVisitOfferReply(event, userId, "要", baseUrl);
    return;
  }
  if (action === "cancel") {
    await handleVisitOfferReply(event, userId, "不要", baseUrl);
    return;
  }
  if (action === "tag") {
    const contactId = params.get("contact");
    const value = params.get("value");
    if (contactId && value) {
      const tags = await contactTagPort.add(contactId, value);
      await lineDeliveryPort.replyText(
        event.replyToken,
        `已標上「${value}」✅${tags.length ? `\n目前標籤：${tags.join("、")}` : ""}`
      );
    }
    return;
  }
  if (action === "tag_done") {
    await lineDeliveryPort.replyText(event.replyToken, "好的，標籤完成 👍 有需要再傳名片給我。");
    return;
  }
}

/** 使用者針對「已產生但尚未寄出的邀約信草稿」的回覆：寄出 / 取消 / 要求修改。 */
async function handleTextMessage(event: LineEvent, userId: string, baseUrl: string) {
  if (!event.replyToken) return;

  const text = (event.message?.text ?? "").trim();

  const handledApproval = await handleInviteApprovalReply(event, userId, text, baseUrl);
  if (handledApproval) return;

  const handledOffer = await handleVisitOfferReply(event, userId, text, baseUrl);
  if (handledOffer) return;

  try {
    await lineDeliveryPort.replyText(
      event.replyToken,
      "已收到您的訊息！目前我最擅長的是名片辨識——直接傳一張名片照片給我，我會自動整理出聯絡資訊，並視需要幫您安排拜訪邀約。"
    );
    await lineActivityPort.record({
      agent_slug: null,
      summary: `收到來自 ${userId} 的訊息：「${event.message?.text?.slice(0, 40)}」，已自動回覆`,
      status: "success",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "回覆失敗";
    await lineActivityPort.record({
      agent_slug: null,
      summary: `回覆來自 ${userId} 的訊息失敗：${message}`,
      status: "failed",
    });
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  // Zeabur（以及多數容器平台）的反向代理不會把外部網域帶進容器內部的 Host header，
  // 所以 req.nextUrl.origin 在正式環境會變成 localhost。改用固定的環境變數組網址。
  const baseUrl = process.env.APP_BASE_URL || req.nextUrl.origin;

  if (!verifyLineSignature(rawBody, signature)) {
    await lineActivityPort.record({
      agent_slug: null,
      summary: "Webhook 收到簽章驗證失敗的請求",
      status: "failed",
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = parseVisitLineWebhookPayload(rawBody);
  if (payload.kind === "invalid") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const events = payload.events;

  await dispatchVisitLineWebhookEvents({
    events,
    baseUrl,
    fallbackUserId: "未知使用者",
    handlers: {
      touchSubscriber: (userId) => subscriberTouchPort.touch(userId, "primary"),
      handleImageMessage,
      handleTextMessage,
      handlePostback,
    },
  });

  return NextResponse.json({ ok: true });
}
