import { NextRequest, NextResponse } from "next/server";
import { createLineOrdersDelivery } from "@/adapters/orders/line-orders-delivery";
import {
  createSupabaseOrdersRepository,
  OrdersRepositoryError,
} from "@/adapters/orders/supabase-orders-repository";
import { verifyTeachifyWebhook } from "@/lib/teachify-webhook-server";
import { getMainSupabase } from "@/lib/supabase";
import { processOrderPayload } from "@/modules/orders/orders";

// Teachify 訂單 webhook 接收端點。請在 Teachify 後台把訂單 webhook 網址
// 設成：https://<你的網域>/api/webhooks/teachify-order
export async function GET() {
  return NextResponse.json({ ok: true, service: "teachify-order-webhook" });
}

export async function POST(req: NextRequest) {
  const repository = createSupabaseOrdersRepository(getMainSupabase());
  const delivery = createLineOrdersDelivery();
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

  let result: Awaited<ReturnType<typeof processOrderPayload>>;
  try {
    result = await processOrderPayload({
      payload,
      rawBody,
      dependencies: { repository, delivery },
    });
  } catch (error) {
    if (!(error instanceof OrdersRepositoryError)) throw error;
    console.error("[orders] Teachify webhook data boundary failed", error);
    return NextResponse.json({ error: "orders data unavailable" }, { status: 503 });
  }

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
