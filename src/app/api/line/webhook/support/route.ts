import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature, replyLineMessage } from "@/lib/line";
import { touchSubscriber } from "@/lib/subscribers";
import { getSupabase } from "@/lib/supabase";

// 第二個 LINE 官方帳號（客服用）的 webhook，跟主控台帳號完全獨立。
// 需要在 LINE Developers Console 把這支帳號的 Webhook URL 指向這裡，
// 並設定 LINE_SUPPORT_CHANNEL_SECRET / LINE_SUPPORT_CHANNEL_ACCESS_TOKEN。
export async function GET() {
  return NextResponse.json({ ok: true, service: "line-support-webhook" });
}

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  const supabase = getSupabase();

  if (!verifyLineSignature(rawBody, signature, "support")) {
    await supabase.from("line_agent_activity").insert({
      agent_slug: "support",
      summary: "客服 Webhook 收到簽章驗證失敗的請求",
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

  const { data: agentRow } = await supabase.from("line_agents").select("settings").eq("slug", "support").single();
  const autoReplyText =
    typeof (agentRow?.settings as Record<string, unknown> | null)?.autoReplyText === "string" &&
    (agentRow?.settings as Record<string, unknown>).autoReplyText
      ? ((agentRow?.settings as Record<string, unknown>).autoReplyText as string)
      : "已收到您的訊息，我們的客服人員會盡快回覆您，謝謝您的耐心等候！";

  await Promise.allSettled(
    events.map(async (event) => {
      if (event.type !== "message" || event.message?.type !== "text" || !event.replyToken) return;
      const userId = event.source?.userId ?? "未知使用者";
      const text = event.message.text ?? "";
      if (event.source?.userId) await touchSubscriber(event.source.userId, "support").catch(() => {});

      try {
        await replyLineMessage(event.replyToken, autoReplyText, "support");
        await supabase.from("line_agent_activity").insert({
          agent_slug: "support",
          summary: `收到客戶 ${userId} 的訊息：「${text.slice(0, 40)}」，已自動回覆並記錄`,
          status: "success",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "回覆失敗";
        await supabase.from("line_agent_activity").insert({
          agent_slug: "support",
          summary: `回覆客戶 ${userId} 的訊息失敗：${message}`,
          status: "failed",
        });
      }
    })
  );

  return NextResponse.json({ ok: true });
}
