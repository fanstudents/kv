import { NextRequest, NextResponse } from "next/server";
import { logConversationMessage } from "@/lib/support-conversations";
import { parseSupportLogReplyRequest, recordSupportLogReply } from "@/modules/support/log-reply";

// 給既有客服機器人（多租戶架構）呼叫用：它每回覆客戶一則訊息，就順手打一次這支 API，
// 讓客服助手(Amber)這邊能留下「完整的客戶對話紀錄」（客戶說的話已經在 LINE Webhook
// 轉發那一關記錄了，這裡補上官方帳號回覆的那一半）。LINE 本身不會把已送出的訊息回傳給我們，
// 所以官方帳號的回覆內容只能靠實際送出訊息的那套系統自己回報。
// 用共用密鑰驗證（header x-log-secret），不驗證 LINE 簽章——因為呼叫者是舊系統，不是 LINE。
export async function GET() {
  return NextResponse.json({ ok: true, service: "support-log-reply" });
}

export async function POST(req: NextRequest) {
  const secret = process.env.SUPPORT_LOG_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing SUPPORT_LOG_SECRET environment variable" }, { status: 500 });
  }
  if (req.headers.get("x-log-secret") !== secret) {
    return NextResponse.json({ error: "invalid secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await recordSupportLogReply(
    parseSupportLogReplyRequest(body),
    (userId, text) => logConversationMessage(userId, "bot", text),
  );
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  if (result.kind === "provider-failed") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
