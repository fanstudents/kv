import { logAiUsage } from "@/lib/ai-usage";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages } from "@/lib/line-message-styles";
import type { getSupabase } from "@/lib/supabase";
import type { SupportConversation } from "@/modules/support/daily-report";
import type { SupportReportPorts } from "@/modules/support/reporting-ports";

const OPENAI_API_BASE = "https://api.openai.com/v1";

type LegacySupabaseClient = ReturnType<typeof getSupabase>;

export function createLegacySupportReportAdapters(
  supabase: LegacySupabaseClient
): SupportReportPorts {
  return {
    repository: {
      async getAgentConfig() {
        const { data } = await supabase
          .from("line_agents")
          .select("enabled, settings")
          .eq("slug", "support")
          .single();
        return data;
      },
      async listCustomerMessages(cutoff) {
        const { data } = await supabase
          .from("line_support_conversations")
          .select("line_user_id, text, occurred_at")
          .eq("role", "customer")
          .gte("occurred_at", cutoff)
          .order("occurred_at", { ascending: true })
          .limit(500);
        return (data ?? []) as SupportConversation[];
      },
      async getDisplayNames(lineUserIds) {
        const { data } = await supabase
          .from("line_subscribers")
          .select("line_user_id, display_name")
          .eq("channel", "support")
          .in("line_user_id", lineUserIds);
        return new Map(
          (data ?? []).map((subscriber) => [
            subscriber.line_user_id as string,
            subscriber.display_name as string | null,
          ])
        );
      },
      async recordActivity(activity) {
        await supabase.from("line_agent_activity").insert({
          agent_slug: "support",
          summary: activity.summary,
          status: activity.status,
        });
      },
    },
    summary: {
      async summarize(rawBrief) {
        const key = process.env.OPENAI_API_KEY;
        if (!key) return null;

        try {
          const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
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
          if (!response.ok) return null;
          const data = await response.json();
          await logAiUsage({
            operation: "客服每日彙報摘要",
            model: "gpt-4o-mini",
            usage: data.usage,
            agentSlug: "support",
          });
          return data.choices?.[0]?.message?.content ?? null;
        } catch {
          return null;
        }
      },
    },
    delivery: {
      async deliver(notification) {
        await pushLineRawMessages(
          notification.recipient,
          buildPushMessages(notification)
        );
      },
    },
  };
}
