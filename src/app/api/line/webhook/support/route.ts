import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature } from "@/lib/line";
import { getMainSupabase } from "@/lib/supabase";
import { createSupportRelayDependencies } from "@/adapters/support/support-relay-dependencies";
import {
  parseSupportRelayPayload,
  processSupportRelay,
} from "@/modules/support/relay";

// 這支帳號由下游客服／助理系統使用；KV 不接管下游的回覆責任。
// 因為 LINE 每個頻道只能設一個 Webhook URL，這裡採用「轉發式」設計：
// 在 LINE Developers Console 把頻道的 Webhook URL 指向這裡；
// 這裡驗完簽章後，原封不動把 raw body／簽章轉送給下游系統，
// 同時把訊息記錄下來供 KV 的客服功能使用，兩邊互不搶用同一個 replyToken。
// 這裡只負責 capture／relay；是否回覆由下游系統決定。
// 需要設定：LINE_SUPPORT_CHANNEL_SECRET（這支帳號真正的 Channel Secret）
//          SUPPORT_RELAY_TARGET_URL（下游客服／助理系統的 relay endpoint）
export async function GET() {
  return NextResponse.json({ ok: true, service: "line-support-webhook-relay" });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  const supabase = getMainSupabase();
  const ports = createSupportRelayDependencies(supabase);

  if (!verifyLineSignature(rawBody, signature, "support")) {
    try {
      await ports.repository.recordActivity({
        summary: "客服 Webhook 收到簽章驗證失敗的請求",
        status: "failed",
      });
    } catch (error) {
      console.error("[support] could not audit rejected LINE webhook", error);
    }
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = parseSupportRelayPayload(rawBody);
  if (payload.type === "invalid") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const events = payload.events;

  const result = await processSupportRelay({
    rawBody,
    signature: signature ?? "",
    contentType: req.headers.get("content-type") ?? "application/json",
    events,
    ports,
  });
  if (result.issues.length > 0) {
    console.error("[support] relay completed with isolated failures", result);
  }

  return NextResponse.json({ ok: true });
}
