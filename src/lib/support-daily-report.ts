import "server-only";
import { getSupabase } from "@/lib/supabase";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages, type PushStyle } from "@/lib/line-message-styles";
import { logAiUsage } from "@/lib/ai-usage";
import {
  finalizeSupportReport,
  planSupportReportDelivery,
  prepareSupportReport,
  supportCustomerIds,
  supportReportCutoff,
  type SupportConversation,
} from "@/modules/support/daily-report";

const OPENAI_API_BASE = "https://api.openai.com/v1";

async function summarizeWithAI(rawBrief: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "你是客服接待專員安柏，每天早上向老闆彙整昨天客服官方帳號收到的所有客戶留言。請用繁體中文，" +
              "以貼心、俐落的口吻，先一句總結昨天客戶進線的整體狀況（幾位客戶、大致在問什麼），" +
              "再依客戶條列（每位客戶一行，用顯示名稱開頭），簡短講他問了什麼、有沒有情緒明顯不佳或需要優先回應的跡象。" +
              "看起來需要老闆親自留意或跟進的（客訴、負面情緒、重複追問沒人回）放在最後單獨標註。" +
              "全文控制在 400 字內，不要用 markdown 符號，條列用「•」開頭。",
          },
          { role: "user", content: rawBrief },
        ],
        temperature: 0.4,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    await logAiUsage({ operation: "客服每日彙報摘要", model: "gpt-4o-mini", usage: data.usage, agentSlug: "support" });
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function runSupportDailyReport(): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabase();

  const { data: agentRow } = await supabase.from("line_agents").select("enabled, settings").eq("slug", "support").single();
  const deliveryPlan = planSupportReportDelivery(agentRow);
  if (deliveryPlan.type !== "deliver") {
    return { ok: false, message: deliveryPlan.message };
  }

  const cutoff = supportReportCutoff(Date.now());
  const { data: rows } = await supabase
    .from("line_support_conversations")
    .select("line_user_id, text, occurred_at")
    .eq("role", "customer")
    .gte("occurred_at", cutoff)
    .order("occurred_at", { ascending: true })
    .limit(500);

  const messages = (rows ?? []) as SupportConversation[];
  const displayNames = new Map<string, string | null>();
  if (messages.length > 0) {
    const uniqueIds = supportCustomerIds(messages);
    // 補上顯示名稱：line_support_conversations 只存 line_user_id，
    // 名字要另外從 line_subscribers 查（客戶第一次進線時 touchSubscriber 已經抓過 LINE 顯示名稱）。
    const { data: subs } = await supabase
      .from("line_subscribers")
      .select("line_user_id, display_name")
      .eq("channel", "support")
      .in("line_user_id", uniqueIds);
    for (const subscriber of subs ?? []) {
      displayNames.set(
        subscriber.line_user_id as string,
        subscriber.display_name as string | null
      );
    }
  }

  const prepared = prepareSupportReport(messages, displayNames, new Date());
  const aiSummary = prepared.rawBrief
    ? await summarizeWithAI(prepared.rawBrief)
    : null;
  const reportText = finalizeSupportReport(prepared, aiSummary);

  try {
    await pushLineRawMessages(
      deliveryPlan.recipient,
      buildPushMessages({
        style: deliveryPlan.style as PushStyle,
        text: reportText,
        title: deliveryPlan.title,
        accentColor: deliveryPlan.accentColor,
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "推播失敗";
    await supabase.from("line_agent_activity").insert({
      agent_slug: "support",
      summary: `每日客服彙報推播失敗：${message}`,
      status: "failed",
    });
    return { ok: false, message };
  }

  await supabase.from("line_agent_activity").insert({
    agent_slug: "support",
    summary: `已向老闆送出每日客服彙報（${prepared.customerCount} 位客戶、${prepared.messageCount} 則留言）`,
    status: "success",
  });

  return {
    ok: true,
    message: `客服彙報已送出（${prepared.customerCount} 位客戶、${prepared.messageCount} 則留言）`,
  };
}
