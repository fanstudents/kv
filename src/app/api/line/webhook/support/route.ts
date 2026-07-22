import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature } from "@/lib/line";
import { touchSubscriber } from "@/lib/subscribers";
import { getSupabase } from "@/lib/supabase";
import { logConversationMessage } from "@/lib/support-conversations";

// 這支帳號實際上是既有客服機器人（多租戶架構，不方便改它的程式碼）在用的 LINE 官方帳號。
// 因為 LINE 每個頻道只能設一個 Webhook URL，這裡改成「轉發式」設計：
// 在 LINE Developers Console 把這支帳號的 Webhook URL 從舊系統改指向這裡；
// 這裡驗完簽章後，原封不動把 raw body／簽章轉送給舊系統的原始 Webhook URL（讓它完全不知道
// 中間多了一手，不用改它任何程式碼），同時把訊息記錄下來給客服助手(Amber)看，兩邊互不影響。
// 這裡「只記錄、不回覆」——回覆客戶的責任還是在舊系統手上，避免搶用同一個 replyToken。
// 需要設定：LINE_SUPPORT_CHANNEL_SECRET（這支帳號真正的 Channel Secret）
//          SUPPORT_RELAY_TARGET_URL（舊系統原本的 Webhook URL，例如 https://tbrchat.zeabur.app/api/webhooks/line）
export async function GET() {
  return NextResponse.json({ ok: true, service: "line-support-webhook-relay" });
}

interface LineEvent {
  type: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
}

async function forwardToLegacySystem(rawBody: string, req: NextRequest) {
  const targetUrl = process.env.SUPPORT_RELAY_TARGET_URL;
  if (!targetUrl) throw new Error("Missing SUPPORT_RELAY_TARGET_URL environment variable");

  const signature = req.headers.get("x-line-signature") ?? "";
  const res = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": req.headers.get("content-type") ?? "application/json",
      "X-Line-Signature": signature,
    },
    body: rawBody,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`舊系統回應 ${res.status}`);
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

  await Promise.allSettled([
    // 轉發給舊系統：它繼續照原本的邏輯處理與回覆客戶，完全不用改它的程式碼
    forwardToLegacySystem(rawBody, req).catch(async (err) => {
      const message = err instanceof Error ? err.message : "轉發失敗";
      await supabase.from("line_agent_activity").insert({
        agent_slug: "support",
        summary: `轉發給舊客服系統失敗：${message}（客戶仍會由舊系統處理，只是這筆沒轉發成功）`,
        status: "failed",
      });
    }),
    // 只記錄，不回覆——回覆的責任在舊系統那邊
    ...events.map(async (event) => {
      if (event.type !== "message" || event.message?.type !== "text") return;
      const userId = event.source?.userId ?? "未知使用者";
      const text = event.message.text ?? "";
      if (event.source?.userId) await touchSubscriber(event.source.userId, "support").catch(() => {});
      await Promise.allSettled([
        supabase.from("line_agent_activity").insert({
          agent_slug: "support",
          summary: `收到客戶 ${userId} 的訊息：「${text.slice(0, 60)}」（已轉發給既有客服系統處理，這裡只記錄）`,
          status: "success",
        }),
        logConversationMessage(userId, "customer", text),
      ]);
    }),
  ]);

  return NextResponse.json({ ok: true });
}
