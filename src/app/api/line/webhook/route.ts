import { NextRequest, NextResponse } from "next/server";
import {
  verifyLineSignature,
  replyLineMessage,
  getLineMessageContentAsDataUrl,
} from "@/lib/line";
import { parseBusinessCard, type ParsedCard } from "@/lib/openai";
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
  return `名片辨識完成 ✅\n\n${lines.join(
    "\n"
  )}\n\n如需安排拜訪，可到控制台的「約拜訪 Agent」頁面，一鍵產生邀約信草稿。`;
}

async function handleImageMessage(event: LineEvent, userId: string) {
  const supabase = getSupabase();
  const messageId = event.message?.id;
  if (!messageId || !event.replyToken) return;

  try {
    const imageDataUrl = await getLineMessageContentAsDataUrl(messageId);
    if (!imageDataUrl.startsWith("data:image/")) {
      await replyLineMessage(event.replyToken, "這個檔案不是圖片格式，請直接傳名片照片給我。");
      return;
    }

    const contact = await parseBusinessCard(imageDataUrl);
    await replyLineMessage(event.replyToken, formatCardReply(contact));

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
  } catch (err) {
    const message = err instanceof Error ? err.message : "名片辨識失敗";
    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `LINE 名片辨識失敗：${message}（來自 ${userId}）`,
      status: "failed",
    });
    await replyLineMessage(
      event.replyToken,
      "抱歉，名片辨識過程發生問題，請稍後再傳一次試試。"
    ).catch(() => {});
  }
}

async function handleTextMessage(event: LineEvent, userId: string) {
  const supabase = getSupabase();
  if (!event.replyToken) return;

  try {
    await replyLineMessage(
      event.replyToken,
      "已收到您的訊息！目前我最擅長的是名片辨識——直接傳一張名片照片給我，我會自動整理出聯絡資訊。"
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
        await handleTextMessage(event, userId);
      }
    })
  );

  return NextResponse.json({ ok: true });
}
