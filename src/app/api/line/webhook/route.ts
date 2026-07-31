import { NextRequest, NextResponse } from "next/server";
import {
  verifyLineSignature,
} from "@/lib/line";
import { buildDecisionCard, buildTagQuickReply } from "@/lib/visit-line-ui";
import { buildInviteEmailHtml } from "@/lib/email-templates";
import {
  parseVisitLineWebhookPayload,
} from "@/modules/visit/line-inbound";
import { dispatchVisitLineWebhookEvents } from "@/modules/visit/line-webhook-application";
import { createVisitLineImageHandler } from "@/modules/visit/line-image-application";
import { createVisitLineInviteApprovalHandler } from "@/modules/visit/line-invite-approval-application";
import { createVisitLineOfferReplyHandler } from "@/modules/visit/line-offer-application";
import { createVisitLinePostbackHandler } from "@/modules/visit/line-postback-application";
import { createVisitLineTextHandler } from "@/modules/visit/line-text-application";
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

const handlePostback = createVisitLinePostbackHandler({
  handleVisitOfferReply,
  tags: contactTagPort,
  delivery: lineDeliveryPort,
});

const handleTextMessage = createVisitLineTextHandler({
  handleInviteApprovalReply,
  handleVisitOfferReply,
  delivery: lineDeliveryPort,
  activity: lineActivityPort,
});

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
