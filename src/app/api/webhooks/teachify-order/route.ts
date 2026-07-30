import { NextRequest, NextResponse } from "next/server";
import { verifyTeachifyWebhook } from "@/lib/teachify-webhook-server";
import { parseOrderPayload } from "@/modules/orders/inbound";
import { planOrderNotification } from "@/modules/orders/notification";
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

  const order = parseOrderPayload(payload);

  if (!order) {
    // 解析不出訂單欄位：記錄原始 payload 前 500 字，方便之後對照真實格式調整
    await repository.recordActivity({
      summary: `收到 Teachify Webhook 但無法解析訂單欄位，原始內容：${rawBody.slice(0, 500)}`,
      status: "failed",
    });
    return NextResponse.json({ ok: true, note: "payload received but not recognized as an order" });
  }

  // 存一份結構化訂單記錄（跟原本給人看的 line_agent_activity 摘要分開），
  // 讓數據 Agent 之後可以直接查詢營收/轉換數字，而不用回頭解析文字摘要。
  // order_id 有 unique 約束，同一筆訂單重送 webhook 只會更新、不會產生重複列。
  await repository.upsertOrder(order);

  const agentRow = await repository.getAgentConfig();
  const notification = planOrderNotification(order, agentRow);
  if (notification.type === "disabled") {
    return NextResponse.json({ ok: true, note: "orders agent disabled, notification skipped" });
  }

  if (notification.type === "missing_recipient") {
    await repository.recordActivity({
      summary: notification.activitySummary,
      status: "failed",
    });
    return NextResponse.json({ ok: true, note: "reportTo not configured" });
  }

  try {
    await delivery.deliver(notification);
    await repository.recordActivity({
      summary: notification.successSummary,
      status: "success",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "推播失敗";
    await repository.recordActivity({
      summary: `訂單通知推播失敗：${message}`,
      status: "failed",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
