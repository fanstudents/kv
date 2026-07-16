import { NextRequest, NextResponse } from "next/server";
import {
  verifyLineSignature,
  replyLineMessage,
  getLineMessageContentAsDataUrl,
} from "@/lib/line";
import { parseBusinessCard, draftInviteEmail, type ParsedCard } from "@/lib/openai";
import { findFreeSlots, sendGmail } from "@/lib/google";
import { buildInviteEmailHtml } from "@/lib/email-templates";
import { getVisitAgentSettings } from "@/lib/visit-settings";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  return NextResponse.json({ ok: true, service: "line-agent-console webhook" });
}

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { id?: string; type: string; text?: string };
}

const CONFIRM_WORDS = ["要", "確認", "確定", "好的", "好", "沒問題", "ok", "OK", "yes", "Yes"];
const CANCEL_WORDS = ["不要", "先不要", "算了", "不用", "cancel", "Cancel"];

function formatCardReply(contact: ParsedCard): string {
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
  const supabase = getSupabase();
  const messageId = event.message?.id;
  const replyToken = event.replyToken;
  if (!messageId || !replyToken) return;

  let contact: ParsedCard;
  try {
    const imageDataUrl = await getLineMessageContentAsDataUrl(messageId);
    if (!imageDataUrl.startsWith("data:image/")) {
      await replyLineMessage(replyToken, "這個檔案不是圖片格式，請直接傳名片照片給我。");
      return;
    }
    contact = await parseBusinessCard(imageDataUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "名片辨識失敗";
    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `LINE 名片辨識失敗：${message}（來自 ${userId}）`,
      status: "failed",
    });
    await replyLineMessage(replyToken, "抱歉，名片辨識過程發生問題，請稍後再傳一次試試。").catch(() => {});
    return;
  }

  const recognized = Boolean(contact.name || contact.company || contact.email);
  await supabase.from("line_agent_activity").insert({
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
    await replyLineMessage(replyToken, replyTexts[0]);
    return;
  }

  const { data: contactRow } = await supabase
    .from("contacts")
    .insert({
      name: contact.name || "（未命名聯絡人）",
      company: contact.company || null,
      title: contact.title || null,
      email: contact.email || null,
      phone: contact.phone || null,
      source: "line_card",
      line_user_id: userId,
    })
    .select()
    .single();

  if (!contact.email) {
    replyTexts.push("這張名片沒有 Email，暫時無法幫您自動安排拜訪邀約，需要的話可以手動聯繫對方。");
    await replyLineMessage(replyToken, replyTexts.join("\n\n"));
    return;
  }

  await supabase.from("visit_offers").insert({
    line_user_id: userId,
    contact_id: contactRow?.id ?? null,
    status: "pending",
  });

  replyTexts.push(
    `要不要幫您安排拜訪邀約？回覆「要」我就會查詢您近期的行事曆空檔，並自動寄一封邀約信給 ${contact.name}。`
  );
  await replyLineMessage(replyToken, replyTexts.join("\n\n"));
}

async function handleVisitOfferReply(
  event: LineEvent,
  userId: string,
  text: string,
  baseUrl: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!event.replyToken) return false;

  const { data: offer } = await supabase
    .from("visit_offers")
    .select("*, contacts(id, name, company, email)")
    .eq("line_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!offer) return false;

  const isConfirm = CONFIRM_WORDS.some((w) => text.includes(w));
  const isCancel = !isConfirm && CANCEL_WORDS.some((w) => text.includes(w));
  if (!isConfirm && !isCancel) return false;

  const contact = offer.contacts as { id: string; name: string; company?: string; email: string } | null;

  if (isCancel || !contact?.email) {
    await supabase
      .from("visit_offers")
      .update({ status: "declined", resolved_at: new Date().toISOString() })
      .eq("id", offer.id);
    await replyLineMessage(event.replyToken, "好的，這次先不安排，需要的話再傳名片給我一次即可。");
    return true;
  }

  await supabase
    .from("visit_offers")
    .update({ status: "accepted", resolved_at: new Date().toISOString() })
    .eq("id", offer.id);

  try {
    const settings = await getVisitAgentSettings(supabase);
    const slots = await findFreeSlots({
      rangeStartDays: settings.rangeStartDays,
      rangeEndDays: settings.rangeEndDays,
      workingHoursStart: settings.workingHoursStart,
      workingHoursEnd: settings.workingHoursEnd,
      meetingDurationMinutes: settings.meetingDuration,
      slotCount: 2,
    });

    if (slots.length < 2) {
      await replyLineMessage(event.replyToken, "查了行事曆但接下來找不到足夠的空檔，需要的話請手動與對方協調時間。");
      await supabase.from("line_agent_activity").insert({
        agent_slug: "visit",
        summary: `查詢行事曆空檔不足，無法幫 ${contact.name} 產生邀約信`,
        status: "failed",
      });
      return true;
    }

    const draft = await draftInviteEmail({
      contactName: contact.name,
      company: contact.company,
      meetingType: settings.meetingType,
      slot1: slots[0].label,
      slot2: slots[1].label,
      senderName: settings.senderName,
    });

    const { data: invite } = await supabase
      .from("pending_invites")
      .insert({
        line_user_id: userId,
        contact_id: contact.id,
        to_email: contact.email,
        subject: draft.subject,
        body: draft.body,
        slot1: slots[0].label,
        slot2: slots[1].label,
        slot1_start: slots[0].start,
        slot1_end: slots[0].end,
        slot2_start: slots[1].start,
        slot2_end: slots[1].end,
        status: "pending",
      })
      .select()
      .single();

    const html = buildInviteEmailHtml({
      introText: draft.body,
      senderName: settings.senderName,
      slot1Label: slots[0].label,
      slot2Label: slots[1].label,
      respondUrl1: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=1`,
      respondUrl2: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=2`,
      respondUrlBoth: `${baseUrl}/api/agents/visit/respond?invite=${invite.id}&choice=both`,
    });

    await sendGmail({ to: contact.email, subject: draft.subject, body: html, html: true });

    await replyLineMessage(
      event.replyToken,
      `已寄出邀約信給 ${contact.name}，提議 ${slots[0].label} 或 ${slots[1].label}，等對方選好時段後我會通知您。`
    );
    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `已寄出邀約信給 ${contact.name}（${contact.email}），等待對方選擇時段`,
      status: "pending",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "排程或寄信失敗";
    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `自動排程或寄信失敗：${message}`,
      status: "failed",
    });
    await replyLineMessage(event.replyToken, "抱歉，自動排程或寄信時遇到問題，請手動與對方聯繫安排時間。").catch(
      () => {}
    );
  }

  return true;
}

async function handleTextMessage(event: LineEvent, userId: string, baseUrl: string) {
  const supabase = getSupabase();
  if (!event.replyToken) return;

  const text = (event.message?.text ?? "").trim();
  const handled = await handleVisitOfferReply(event, userId, text, baseUrl);
  if (handled) return;

  try {
    await replyLineMessage(
      event.replyToken,
      "已收到您的訊息！目前我最擅長的是名片辨識——直接傳一張名片照片給我，我會自動整理出聯絡資訊，並視需要幫您安排拜訪邀約。"
    );
    await supabase.from("line_agent_activity").insert({
      agent_slug: null,
      summary: `收到來自 ${userId} 的訊息：「${event.message?.text?.slice(0, 40)}」，已自動回覆`,
      status: "success",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "回覆失敗";
    await supabase.from("line_agent_activity").insert({
      agent_slug: null,
      summary: `回覆來自 ${userId} 的訊息失敗：${message}`,
      status: "failed",
    });
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  const supabase = getSupabase();
  const baseUrl = req.nextUrl.origin;

  if (!verifyLineSignature(rawBody, signature)) {
    await supabase.from("line_agent_activity").insert({
      agent_slug: null,
      summary: "Webhook 收到簽章驗證失敗的請求",
      status: "failed",
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    events = JSON.parse(rawBody).events ?? [];
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await Promise.allSettled(
    events.map(async (event) => {
      if (event.type !== "message" || !event.replyToken) return;
      const userId = event.source?.userId ?? "未知使用者";

      if (event.message?.type === "image") {
        await handleImageMessage(event, userId);
      } else if (event.message?.type === "text") {
        await handleTextMessage(event, userId, baseUrl);
      }
    })
  );

  return NextResponse.json({ ok: true });
}
