import { NextRequest, NextResponse } from "next/server";
import { formatOrderText } from "@/lib/teachify-orders";
import { parseOrderPayload, verifyTeachifyWebhook } from "@/lib/teachify-webhook-server";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages, type PushStyle } from "@/lib/line-message-styles";
import { getSupabase } from "@/lib/supabase";

// Teachify 訂單 webhook 接收端點。請在 Teachify 後台把訂單 webhook 網址
// 設成：https://<你的網域>/api/webhooks/teachify-order
export async function GET() {
  return NextResponse.json({ ok: true, service: "teachify-order-webhook" });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const rawBody = await req.text();

  const verification = verifyTeachifyWebhook(rawBody, req.headers.get("x-teachify-signature"));
  if (verification === "invalid") {
    await supabase.from("line_agent_activity").insert({
      agent_slug: "orders",
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
    await supabase.from("line_agent_activity").insert({
      agent_slug: "orders",
      summary: `收到 Teachify Webhook 但無法解析訂單欄位，原始內容：${rawBody.slice(0, 500)}`,
      status: "failed",
    });
    return NextResponse.json({ ok: true, note: "payload received but not recognized as an order" });
  }

  const { data: agentRow } = await supabase.from("line_agents").select("enabled, settings").eq("slug", "orders").single();
  if (agentRow?.enabled === false) {
    return NextResponse.json({ ok: true, note: "orders agent disabled, notification skipped" });
  }
  const settings = (agentRow?.settings ?? {}) as Record<string, unknown>;
  const reportTo = typeof settings.reportTo === "string" ? settings.reportTo.trim() : "";
  const pushStyle: PushStyle = ["text", "flex", "confirm", "buttons"].includes(settings.pushStyle as string)
    ? (settings.pushStyle as PushStyle)
    : "flex";

  if (!reportTo) {
    await supabase.from("line_agent_activity").insert({
      agent_slug: "orders",
      summary: `收到新訂單（${order.tradeNo}）但尚未設定通知對象，請到訂單 Agent 設定頁補上`,
      status: "failed",
    });
    return NextResponse.json({ ok: true, note: "reportTo not configured" });
  }

  const text = formatOrderText(order);

  try {
    await pushLineRawMessages(
      reportTo,
      buildPushMessages({ style: pushStyle, text, title: order.isRefund ? "訂單退款通知" : "新訂單通知", accentColor: "#F59E0B" })
    );
    await supabase.from("line_agent_activity").insert({
      agent_slug: "orders",
      summary: `${order.isRefund ? "退款" : "新訂單"}通知已送出：${order.userName} / ${order.itemNames.join("、")} / ${order.currency} ${order.amount}`,
      status: "success",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "推播失敗";
    await supabase.from("line_agent_activity").insert({
      agent_slug: "orders",
      summary: `訂單通知推播失敗：${message}`,
      status: "failed",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
