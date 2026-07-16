import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature, replyLineMessage } from "@/lib/line";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  return NextResponse.json({ ok: true, service: "line-agent-console webhook" });
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
      if (event.type === "message" && event.message?.type === "text" && event.replyToken) {
        const userId = event.source?.userId ?? "未知使用者";
        try {
          await replyLineMessage(
            event.replyToken,
            "已收到您的訊息，這裡是 LINE Agent 控制台的測試回覆。"
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
    })
  );

  return NextResponse.json({ ok: true });
}
