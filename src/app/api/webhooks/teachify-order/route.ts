import { NextRequest, NextResponse } from "next/server";
import { formatOrderText } from "@/lib/teachify-orders";
import { parseOrderPayload, verifyTeachifyWebhook } from "@/lib/teachify-webhook-server";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages, type PushStyle } from "@/lib/line-message-styles";
import { getSupabase } from "@/lib/supabase";
import { tracked, logStep, saveArtifact } from "@/lib/agent-runs";
import { remember } from "@/lib/agent-memory";

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

  // 整筆處理包成一次執行。triggerRef 用訂單 id：Teachify 重送同一筆 webhook 時
  // 會沿用原本那次執行，而不是變成第二次推播。
  try {
    const result = await tracked(
      {
        agentSlug: "orders",
        trigger: "webhook",
        triggerRef: `order:${order.id}`,
        meta: { orderId: order.id, tradeNo: order.tradeNo, amount: order.amount },
        summarize: (r: { note?: string }) => r.note ?? `已通知訂單 ${order.tradeNo}`,
      },
      async (runId): Promise<{ ok: boolean; note?: string; message?: string }> => {
        // 存一份結構化訂單記錄（跟原本給人看的 line_agent_activity 摘要分開），
        // 讓數據 Agent 之後可以直接查詢營收/轉換數字，而不用回頭解析文字摘要。
        // order_id 有 unique 約束，同一筆訂單重送 webhook 只會更新、不會產生重複列。
        await supabase.from("teachify_orders").upsert(
          {
            order_id: order.id,
            trade_no: order.tradeNo || null,
            amount: order.amount,
            currency: order.currency,
            user_name: order.userName,
            user_email: order.userEmail || null,
            item_names: order.itemNames,
            coupon_code: order.couponCode,
            is_refund: order.isRefund,
            paid_at: order.paidAt,
            source: "webhook",
          },
          { onConflict: "order_id" }
        );
        await logStep(runId, "order-store", {
          status: "done",
          output: `${order.userName} / ${order.currency} ${order.amount}`,
          seq: 0,
        });

        const { data: agentRow } = await supabase
          .from("line_agents")
          .select("enabled, settings")
          .eq("slug", "orders")
          .single();
        if (agentRow?.enabled === false) {
          await logStep(runId, "order-notify", { status: "skipped", output: "訂單 Agent 已停用", seq: 1 });
          return { ok: true, note: "orders agent disabled, notification skipped" };
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
          // 這是設定缺漏，不是暫時性故障——回報失敗讓它出現在執行紀錄，但不會被自動重跑
          return { ok: false, message: "尚未設定通知對象（reportTo）" };
        }

        const text = formatOrderText(order);
        await pushLineRawMessages(
          reportTo,
          buildPushMessages({
            style: pushStyle,
            text,
            title: order.isRefund ? "訂單退款通知" : "新訂單通知",
            accentColor: "#F59E0B",
          })
        );
        await logStep(runId, "order-notify", { status: "done", output: `已推播給 ${reportTo}`, seq: 1 });

        await supabase.from("line_agent_activity").insert({
          agent_slug: "orders",
          summary: `${order.isRefund ? "退款" : "新訂單"}通知已送出：${order.userName} / ${order.itemNames.join("、")} / ${order.currency} ${order.amount}`,
          status: "success",
        });

        await saveArtifact({
          agentSlug: "orders",
          kind: "message",
          title: `${order.isRefund ? "退款" : "新訂單"}通知：${order.tradeNo}`,
          content: text,
          runId,
          meta: { orderId: order.id, amount: order.amount, currency: order.currency },
        });

        await remember({
          content: `${order.userName} ${order.isRefund ? "退款" : "購買"}「${order.itemNames.join("、")}」，${order.currency} ${order.amount}`,
          agentSlug: "orders",
          kind: "episodic",
          sourceRunId: runId,
          ttlDays: 180,
        });

        return { ok: true };
      }
    );
    return NextResponse.json(result);
  } catch (err) {
    // tracked 已經把執行標成 failed 了；這裡回 502 讓 Teachify 端知道沒收成功
    const message = err instanceof Error ? err.message : "處理失敗";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
