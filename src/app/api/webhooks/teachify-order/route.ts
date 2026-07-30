import { NextRequest, NextResponse } from "next/server";
import { verifyTeachifyWebhook } from "@/lib/teachify-webhook-server";
import { processOrderPayload } from "@/modules/orders/application";
import { getSupabase } from "@/lib/supabase";
import { createLegacyOrdersAdapters } from "@/adapters/orders/legacy-orders-adapters";

// Teachify 訂單 webhook 接收端點。請在 Teachify 後台把訂單 webhook 網址
// 設成：https://<你的網域>/api/webhooks/teachify-order
export async function GET() {
  return NextResponse.json({ ok: true, service: "teachify-order-webhook" });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const { repository, delivery } = createLegacyOrdersAdapters(supabase);
  const rawBody = await req.text();

  const verification = verifyTeachifyWebhook(rawBody, req.headers.get("x-teachify-signature"));
  if (verification === "invalid") {
    await repository.recordActivity({
      summary: "Teachify 訂單 Webhook 簽章驗證失敗，已拒絕",
      status: "failed",
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const result = await processOrderPayload({
    payload,
    rawBody,
    ports: { repository, delivery },
  });

  switch (result.type) {
    case "unrecognized":
      return NextResponse.json({
        ok: true,
        note: "payload received but not recognized as an order",
      });
    case "disabled":
      return NextResponse.json({
        ok: true,
        note: "orders agent disabled, notification skipped",
      });
    case "missing_recipient":
      return NextResponse.json({ ok: true, note: "reportTo not configured" });
    case "delivery_failed":
      return NextResponse.json({ error: result.message }, { status: 502 });
    case "delivered":
      return NextResponse.json({ ok: true });
  }
}
