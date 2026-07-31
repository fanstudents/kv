import { NextRequest, NextResponse } from "next/server";
import {
  verifyLineSignature,
} from "@/lib/line";
import { buildDecisionCard, buildTagQuickReply } from "@/lib/visit-line-ui";
import { buildInviteEmailHtml } from "@/lib/email-templates";
import {
  classifyVisitApprovalText,
  classifyVisitDecisionText,
  parseVisitLineWebhookPayload,
  type LineInboundEvent,
} from "@/modules/visit/line-inbound";
import { dispatchVisitLineWebhookEvents } from "@/modules/visit/line-webhook-application";
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

const {
  draftInviteEmail,
  interpretCardReply,
  reviseInviteEmail,
  findFreeSlots,
  sendEmail,
} = legacyVisitProviders;
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

export async function GET() {
  return NextResponse.json({ ok: true, service: "line-agent-console webhook" });
}

type LineEvent = LineInboundEvent;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

/** 使用者針對「名片辨識結果」的回覆：確認 / 取消 / 修正欄位。 */
async function handleVisitOfferReply(
  event: LineEvent,
  userId: string,
  text: string,
  baseUrl: string
): Promise<boolean> {
  if (!event.replyToken) return false;

  const offer = await lineWorkflowPersistencePort.findPendingOffer(userId);

  if (!offer) return false;

  const contact = offer.contact;
  if (!contact) return false;

  let intent: Awaited<ReturnType<typeof interpretCardReply>>;
  try {
    intent = await interpretCardReply({
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
    intent = classifyVisitDecisionText(text);
  }

  if (intent.type === "other") {
    await lineDeliveryPort.replyText(
      event.replyToken,
      "不好意思，我沒聽懂 🙏 資訊正確的話請回覆「要」；要修正的話請告訴我欄位與正確的值（例如「公司應該是 XX 科技」）；不需要安排的話請回覆「不要」。"
    );
    return true;
  }

  if (intent.type === "cancel") {
    await lineWorkflowPersistencePort.resolveOffer(offer.id, "declined", new Date().toISOString());
    await reportVisitStep({
      userId,
      nodeId: "tag",
      step: 2,
      status: "done",
      caption: `已依您的指示，這次不安排（${contact.name}）`,
      detail: "改為標註客戶標籤，流程在此收尾",
    });
    await endVisitRun({ userId, status: "cancelled", summary: `${contact.name} 這次不安排拜訪，已改標客戶標籤` });
    // 「要／不要」與「標籤選單」是一次跳出的兩張卡，使用者點了不要之後
    // 標籤選單（quickReply）會跟著這則回覆消失，所以在這裡接續再帶一次，
    // 讓使用者仍可順手替這位客戶分類。
    const availableTags = await contactTagPort.list();
    await lineDeliveryPort.replyMessages(event.replyToken, [
      { type: "text", text: "好的，這次先不安排，需要的話再傳名片給我一次即可。" },
      buildTagQuickReply({ contactId: contact.id, tags: availableTags }),
    ]);
    await conversationLockPort.release(userId, VISIT_AGENT);
    return true;
  }

  if (intent.type === "correction") {
    await lineWorkflowPersistencePort.updateContactField(contact.id, intent.field, intent.value);
    const updated: VisitBusinessCard = {
      name: intent.field === "name" ? intent.value : contact.name ?? "",
      company: intent.field === "company" ? intent.value : contact.company ?? "",
      title: intent.field === "title" ? intent.value : contact.title ?? "",
      email: intent.field === "email" ? intent.value : contact.email ?? "",
      phone: intent.field === "phone" ? intent.value : contact.phone ?? "",
    };
    await lineDeliveryPort.replyText(
      event.replyToken,
      `已更新 ✅\n\n${formatCardReply(updated)}\n\n還有其他要修正的嗎？資訊都對的話請回覆「要」。`
    );
    return true;
  }

  // intent.type === "confirm"：重新讀一次 contacts，確保拿到修正後的最新資料。
  const freshContact = await lineWorkflowPersistencePort.findContact(contact.id);
  const finalContact = freshContact ?? contact;

  if (!finalContact.email || !EMAIL_RE.test(finalContact.email)) {
    await lineDeliveryPort.replyText(
      event.replyToken,
      `目前的 Email（${finalContact.email || "空白"}）看起來格式不太對，麻煩回覆正確的 Email，我才能繼續安排邀約信。`
    );
    return true;
  }

  await lineWorkflowPersistencePort.resolveOffer(offer.id, "accepted", new Date().toISOString());

  try {
    // 你已確認 → 開始比對雙方行事曆空檔
    await reportVisitStep({
      userId,
      nodeId: "match",
      step: 2,
      status: "active",
      caption: `比對行事曆空檔（${finalContact.name}）`,
      detail: "讀取與行程助理共用的 Google 日曆",
    });
    const settings = await visitSettingsPort.get();
    const slots = await findFreeSlots({
      rangeStartDays: settings.rangeStartDays,
      rangeEndDays: settings.rangeEndDays,
      workingHoursStart: settings.workingHoursStart,
      workingHoursEnd: settings.workingHoursEnd,
      meetingDurationMinutes: settings.meetingDuration,
      slotCount: 2,
    });

    if (slots.length < 2) {
      await lineDeliveryPort.replyText(event.replyToken, "查了行事曆但接下來找不到足夠的空檔，需要的話請手動與對方協調時間。");
      await lineActivityPort.record({
        agent_slug: "visit",
        summary: `查詢行事曆空檔不足，無法幫 ${finalContact.name} 產生邀約信`,
        status: "failed",
      });
      await conversationLockPort.release(userId, VISIT_AGENT);
      return true;
    }

    const draft = await draftInviteEmail({
      contactName: finalContact.name,
      contactTitle: finalContact.title,
      company: finalContact.company,
      meetingType: settings.meetingType,
      slot1: slots[0].label,
      slot2: slots[1].label,
      senderName: settings.senderName,
    });

    const invite = await lineWorkflowPersistencePort.createPendingInvite(userId, {
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
      // 邀約信草稿已備妥，等你核准後寄出
      await reportVisitStep({
        userId,
        nodeId: "draft",
        step: 3,
        status: "active",
        caption: `邀約信草稿已備妥：${finalContact.name}`,
      });
      await lineDeliveryPort.replyText(
        event.replyToken,
        `邀約信草稿已經準備好，寄出前想先讓您過目：\n\n收件人：${finalContact.name}（${finalContact.email}）\n主旨：${draft.subject}\n內文：\n${draft.body}\n\n提議時段：${slots[0].label} 或 ${slots[1].label}\n\n內容 OK 的話請回覆「寄出」，不想寄了請回覆「取消」，想調整的話直接告訴我要怎麼改（例如「語氣正式一點」）。`
      );
      await lineActivityPort.record({
        agent_slug: "visit",
        summary: `已產生邀約信草稿給 ${finalContact.name}（${finalContact.email}），待使用者核准後才會寄出`,
        status: "pending",
      });
      // 仍在同一個 Agent 的多輪對話中，鎖繼續保留到使用者核准或取消為止。
      return true;
    }

    // requireApproval 關閉：維持舊行為，確認後直接寄出。
    const html = buildInviteEmailHtml({
      introText: draft.body,
      senderName: settings.senderName,
      slot1Label: slots[0].label,
      slot2Label: slots[1].label,
      respondUrl1: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=1`,
      respondUrl2: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=2`,
      respondUrlBoth: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=both`,
    });
    await reportVisitStep({
      userId,
      nodeId: "draft",
      step: 3,
      status: "active",
      caption: `寄出邀約信給 ${finalContact.name}…`,
    });
    await sendEmail({ to: finalContact.email, subject: draft.subject, body: html, html: true });
    await saveVisitArtifact({
      userId,
      title: `邀約信：${finalContact.name}`,
      content: html,
      meta: { to: finalContact.email, slots: [slots[0].label, slots[1].label] },
    });
    await reportVisitStep({
      userId,
      nodeId: "sent",
      step: 4,
      status: "done",
      caption: `已寄出邀約信給 ${finalContact.name}`,
      detail: `寄至 ${finalContact.email}`,
    });
    await endVisitRun({ userId, status: "success", summary: `已寄出邀約信給 ${finalContact.name}` });
    await lineDeliveryPort.replyText(
      event.replyToken,
      `已寄出邀約信給 ${finalContact.name}，提議 ${slots[0].label} 或 ${slots[1].label}，等對方選好時段後我會通知您。`
    );
    await lineActivityPort.record({
      agent_slug: "visit",
      summary: `已寄出邀約信給 ${finalContact.name}（${finalContact.email}），等待對方選擇時段`,
      status: "pending",
    });
    await conversationLockPort.release(userId, VISIT_AGENT);
  } catch (err) {
    const message = err instanceof Error ? err.message : "排程或寄信失敗";
    await lineActivityPort.record({
      agent_slug: "visit",
      summary: `自動排程或寄信失敗：${message}`,
      status: "failed",
    });
    await lineDeliveryPort.replyText(event.replyToken, "抱歉，自動排程或寄信時遇到問題，請手動與對方聯繫安排時間。").catch(
      () => {}
    );
    await conversationLockPort.release(userId, VISIT_AGENT);
  }

  return true;
}

/** 使用者針對「已產生但尚未寄出的邀約信草稿」的回覆：寄出 / 取消 / 要求修改。 */
async function handleInviteApprovalReply(event: LineEvent, userId: string, text: string, baseUrl: string): Promise<boolean> {
  if (!event.replyToken) return false;

  const invite = await lineWorkflowPersistencePort.findPendingApprovalInvite(userId);

  if (!invite) return false;

  const contact = invite.contact;
  if (!contact) return false;

  const approvalIntent = classifyVisitApprovalText(text);

  if (approvalIntent.type === "cancel") {
    await lineWorkflowPersistencePort.updateInviteStatus(invite.id, "cancelled");
    await lineDeliveryPort.replyText(event.replyToken, "好的，已取消，不會寄出這封信。");
    await conversationLockPort.release(userId, VISIT_AGENT);
    return true;
  }

  if (approvalIntent.type === "send") {
    try {
      const html = buildInviteEmailHtml({
        introText: invite.body,
        senderName: (await visitSettingsPort.get()).senderName,
        slot1Label: invite.slot1,
        slot2Label: invite.slot2,
        respondUrl1: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=1`,
        respondUrl2: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=2`,
        respondUrlBoth: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=both`,
      });
      await reportVisitStep({
        userId,
        nodeId: "draft",
        step: 3,
        status: "active",
        caption: `寄出邀約信給 ${contact.name}…`,
      });
      await sendEmail({ to: contact.email, subject: invite.subject, body: html, html: true });
      await lineWorkflowPersistencePort.updateInviteStatus(invite.id, "pending");
      await saveVisitArtifact({
        userId,
        title: `邀約信：${contact.name}`,
        content: html,
        meta: { to: contact.email, slots: [invite.slot1, invite.slot2] },
      });
      await reportVisitStep({
        userId,
        nodeId: "sent",
        step: 4,
        status: "done",
        caption: `已寄出邀約信給 ${contact.name}`,
        detail: `寄至 ${contact.email}`,
      });
      await endVisitRun({ userId, status: "success", summary: `已寄出邀約信給 ${contact.name}` });
      await lineDeliveryPort.replyText(
        event.replyToken,
        `已寄出邀約信給 ${contact.name}，提議 ${invite.slot1} 或 ${invite.slot2}，等對方選好時段後我會通知您。`
      );
      await lineActivityPort.record({
        agent_slug: "visit",
        summary: `使用者核准後已寄出邀約信給 ${contact.name}（${contact.email}），等待對方選擇時段`,
        status: "pending",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "寄信失敗";
      await lineWorkflowPersistencePort.updateInviteStatus(invite.id, "failed");
      await lineActivityPort.record({
        agent_slug: "visit",
        summary: `核准後寄信失敗：${message}`,
        status: "failed",
      });
      await lineDeliveryPort.replyText(event.replyToken, "抱歉，寄信時遇到問題，請手動與對方聯繫安排時間。").catch(() => {});
    }
    await conversationLockPort.release(userId, VISIT_AGENT);
    return true;
  }

  // 其餘文字一律視為修改要求，重新產出草稿再請使用者過目一次。
  try {
    const settings = await visitSettingsPort.get();
    const revised = await reviseInviteEmail({
      contactName: contact.name,
      contactTitle: contact.title,
      company: contact.company,
      meetingType: settings.meetingType,
      senderName: settings.senderName,
      previousSubject: invite.subject,
      previousBody: invite.body,
      instruction: text,
    });
    await lineWorkflowPersistencePort.updateInviteDraft(invite.id, revised.subject, revised.body);
    await lineDeliveryPort.replyText(
      event.replyToken,
      `已依您的要求調整 ✏️\n\n主旨：${revised.subject}\n內文：\n${revised.body}\n\n提議時段：${invite.slot1} 或 ${invite.slot2}\n\n這樣可以的話請回覆「寄出」，還要調整請繼續告訴我，不寄了請回覆「取消」。`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "修改邀約信失敗";
    await lineActivityPort.record({
      agent_slug: "visit",
      summary: `依使用者要求修改邀約信失敗：${message}`,
      status: "failed",
    });
    await lineDeliveryPort.replyText(event.replyToken, "抱歉，剛剛調整內容時遇到問題，可以再說一次要怎麼修改嗎？").catch(() => {});
  }

  return true;
}

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
