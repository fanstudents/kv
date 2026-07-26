import "server-only";
import { getSupabase } from "@/lib/supabase";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages, type PushStyle } from "@/lib/line-message-styles";
import { logAiUsage } from "@/lib/ai-usage";

const OPENAI_API_BASE = "https://api.openai.com/v1";

interface ConversationRow {
  line_user_id: string;
  text: string;
  occurred_at: string;
}

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
  if (agentRow && agentRow.enabled === false) {
    return { ok: false, message: "客服 Agent 已停用，略過匯報" };
  }
  const settings = (agentRow?.settings ?? {}) as Record<string, unknown>;
  const reportTo = typeof settings.reportTo === "string" ? settings.reportTo.trim() : "";
  const pushStyle: PushStyle = ["text", "flex", "confirm", "buttons"].includes(settings.pushStyle as string)
    ? (settings.pushStyle as PushStyle)
    : "flex";

  if (!reportTo) {
    return { ok: false, message: "尚未設定匯報對象（reportTo）" };
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabase
    .from("line_support_conversations")
    .select("line_user_id, text, occurred_at")
    .eq("role", "customer")
    .gte("occurred_at", cutoff)
    .order("occurred_at", { ascending: true })
    .limit(500);

  const messages = (rows ?? []) as ConversationRow[];

  const dateLabel = new Date().toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  let reportText: string;
  let customerCount = 0;

  if (messages.length === 0) {
    reportText = `${dateLabel} 客服彙報\n\n過去 24 小時客服官方帳號沒有收到新的客戶留言。`;
  } else {
    const uniqueIds = [...new Set(messages.map((m) => m.line_user_id))];
    customerCount = uniqueIds.length;

    // 補上顯示名稱：line_support_conversations 只存 line_user_id，
    // 名字要另外從 line_subscribers 查（客戶第一次進線時 touchSubscriber 已經抓過 LINE 顯示名稱）。
    const { data: subs } = await supabase
      .from("line_subscribers")
      .select("line_user_id, display_name")
      .eq("channel", "support")
      .in("line_user_id", uniqueIds);
    const nameOf = new Map((subs ?? []).map((s) => [s.line_user_id as string, s.display_name as string | null]));

    const byCustomer = new Map<string, ConversationRow[]>();
    for (const m of messages) {
      const list = byCustomer.get(m.line_user_id) ?? [];
      list.push(m);
      byCustomer.set(m.line_user_id, list);
    }

    const lines: string[] = [`統計：${customerCount} 位客戶、共 ${messages.length} 則留言`];
    for (const [userId, list] of byCustomer) {
      const label = nameOf.get(userId) || `未命名客戶（${userId.slice(0, 10)}…）`;
      lines.push(`\n${label}（${list.length} 則）：`);
      for (const m of list.slice(0, 8)) {
        lines.push(`- ${m.text.slice(0, 120)}`);
      }
    }

    const rawBrief = lines.join("\n");
    const aiSummary = await summarizeWithAI(rawBrief);
    reportText = `${dateLabel} 客服彙報\n\n${aiSummary ?? rawBrief}`;
  }

  try {
    await pushLineRawMessages(
      reportTo,
      buildPushMessages({
        style: pushStyle,
        text: reportText,
        title: "客服 Agent・每日彙報",
        accentColor: "#EC4899",
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
    summary: `已向老闆送出每日客服彙報（${customerCount} 位客戶、${messages.length} 則留言）`,
    status: "success",
  });

  return { ok: true, message: `客服彙報已送出（${customerCount} 位客戶、${messages.length} 則留言）` };
}
