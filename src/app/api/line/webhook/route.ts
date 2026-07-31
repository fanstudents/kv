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

const VISIT_AGENT = "visit";

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

async function handleImageMessage(event: LineEvent, userId: string) {
  const messageId = event.message?.id;
  const replyToken = event.replyToken;
  if (!messageId || !replyToken) return;

  let contact: VisitBusinessCard;
  try {
    const imageDataUrl = await lineImagePort.getImageDataUrl(messageId);
    if (!imageDataUrl.startsWith("data:image/")) {
      await lineDeliveryPort.replyText(replyToken, "這個檔案不是圖片格式，請直接傳名片照片給我。");
      return;
    }
    // 一張名片＝一次執行。messageId 當冪等鍵：LINE webhook 重送不會變成第二次執行。
    await startVisitRun({ userId, messageId, summary: "LINE 傳入名片，開始辨識" });
    // 劇院螢幕：名片一進來就進入「辨識中」，並帶上真實照片
    await reportVisitStep({
      userId,
      nodeId: "scan",
      step: 0,
      status: "active",
      caption: "辨識名片中…",
      image: imageDataUrl,
    });
    contact = await lineImagePort.parseBusinessCard(imageDataUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "名片辨識失敗";
    await lineActivityPort.record({
      agent_slug: "visit",
      summary: `LINE 名片辨識失敗：${message}（來自 ${userId}）`,
      status: "failed",
    });
    await endVisitRun({ userId, status: "failed", summary: `名片辨識失敗：${message}`, errorDetail: message });
    await lineDeliveryPort.replyText(replyToken, "抱歉，名片辨識過程發生問題，請稍後再傳一次試試。").catch(() => {});
    return;
  }

  const recognized = Boolean(contact.name || contact.company || contact.email);
  await lineActivityPort.record({
    agent_slug: "visit",
    summary: recognized
      ? `透過 LINE 辨識名片：${contact.name || "（未辨識出姓名）"}${
          contact.company ? ` / ${contact.company}` : ""
        }（來自 ${userId}）`
      : `收到 ${userId} 的圖片，但未辨識出名片資訊`,
    status: recognized ? "success" : "pending",
  });

  const replyTexts = [formatCardReply(contact)];

  if (!recognized) {
    await reportVisitStep({ userId, nodeId: "scan", step: 0, status: "active", caption: "未辨識出名片資訊" });
    await endVisitRun({ userId, status: "failed", summary: "圖片中未辨識出名片資訊" });
    await lineDeliveryPort.replyText(replyToken, replyTexts[0]);
    return;
  }

  // 辨識成功 → 寫入聯絡人（辨識✓ 寫入✓），暫停等你回覆「要／不要」
  // 辨識完就等於「寫入聯絡人」也走完了，兩步都記下來（畫面上會依序打勾）
  await reportVisitStep({
    userId,
    nodeId: "write",
    step: 1,
    status: "active",
    caption: `寫入聯絡人：${contact.name || "（未命名）"}`,
    detail: [contact.company, contact.title, contact.email].filter(Boolean).join(" / "),
  });
  await reportVisitStep({
    userId,
    nodeId: "confirm",
    step: 2,
    status: "waiting",
    caption: `${contact.name || "名片"}${contact.company ? ` · ${contact.company}` : ""}`,
    detail: "等待指揮官回覆要不要安排拜訪",
  });

  // 多輪對話即將開始，先搶下這個使用者的鎖（同一 Agent 重入會自動延長，不會卡住自己）。
  await conversationLockPort.acquire(userId, VISIT_AGENT, { context: { stage: "card_review" } });

  const contactRow = await lineCardPersistencePort.createContact(contact, userId);

  if (!contact.email) {
    // 沒 Email → 不安排邀約，但仍可幫你標籤分類
    const availableTags = await contactTagPort.list();
    const noEmailMsgs: unknown[] = [
      { type: "text", text: `${replyTexts[0]}\n\n這張名片沒有 Email，暫時無法自動安排拜訪邀約，需要的話可以手動聯繫對方。` },
    ];
    if (contactRow?.id) noEmailMsgs.push(buildTagQuickReply({ contactId: contactRow.id, tags: availableTags }));
    await lineDeliveryPort.replyMessages(replyToken, noEmailMsgs);
    await conversationLockPort.release(userId, VISIT_AGENT);
    return;
  }

  const offerRow = await lineCardPersistencePort.createOffer(userId, contactRow?.id);

  // 回覆：辨識資訊 +「要／不要」卡片。標籤選單不在這裡一起跳出——避免兩張卡片
  // 同時出現造成混淆；等使用者做完「要／不要」決定後，才接續出現標籤選單。
  const messages: unknown[] = [
    {
      type: "text",
      text: `${replyTexts[0]}\n\n有欄位不對就直接回覆修正（例如「Email 應該是 abc@xyz.com」），我會更新後再問一次。`,
    },
  ];
  if (offerRow?.id) {
    messages.push(buildDecisionCard({ offerId: offerRow.id, name: contact.name || "這位客戶", company: contact.company }));
  }
  await lineDeliveryPort.replyMessages(replyToken, messages);
}

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
