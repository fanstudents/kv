import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature } from "@/lib/line";
import { getMainSupabase } from "@/lib/supabase";
import { createSupportRelayDependencies } from "@/adapters/support/support-relay-dependencies";
import {
  parseSupportRelayPayload,
  processSupportRelay,
  type SupportRelayLineEvent,
} from "@/modules/support/relay";

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

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  const supabase = getMainSupabase();
  const ports = createSupportRelayDependencies(supabase);

  if (!verifyLineSignature(rawBody, signature, "support")) {
    await ports.repository.recordActivity({
      summary: "客服 Webhook 收到簽章驗證失敗的請求",
      status: "failed",
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = parseSupportRelayPayload(rawBody);
  if (payload.type === "invalid") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const events = payload.events as SupportRelayLineEvent[];

  await processSupportRelay({
    rawBody,
    signature: signature ?? "",
    contentType: req.headers.get("content-type") ?? "application/json",
    events,
    ports,
  });

  return NextResponse.json({ ok: true });
}
