import { AGENTS } from "@/lib/agent-data";
import { logAiUsage } from "@/lib/ai-usage";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages } from "@/lib/line-message-styles";
import type { getSupabase } from "@/lib/supabase";
import type { ReportingActivity } from "@/modules/reporting/daily-report";
import type { ReportingPorts } from "@/modules/reporting/ports";

const OPENAI_API_BASE = "https://api.openai.com/v1";

type LegacySupabaseClient = ReturnType<typeof getSupabase>;

export function createLegacyReportingAdapters(
  supabase: LegacySupabaseClient
): ReportingPorts {
  return {
    repository: {
      async getAgentConfig() {
        const { data } = await supabase
          .from("line_agents")
          .select("enabled, settings")
          .eq("slug", "teamlead")
          .single();
        return data;
      },
      async listActivities(cutoff) {
        const { data } = await supabase
          .from("line_agent_activity")
          .select("agent_slug, occurred_at, summary, status")
          .gte("occurred_at", cutoff)
          .neq("agent_slug", "teamlead")
          .order("occurred_at", { ascending: false })
          .limit(200);
        return (data ?? []) as ReportingActivity[];
      },
      async recordActivity(activity) {
        await supabase.from("line_agent_activity").insert({
          agent_slug: "teamlead",
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
                    "你是 AI 團隊的大總管薇薇安，每天早上向老闆匯報。請用繁體中文，以簡潔幹練、稍帶溫度的主管口吻，" +
                    "將以下團隊活動整理成一段晨報：先一句總結整體狀況，再條列每位有動作的成員做了什麼（每人一行、用成員名字開頭），" +
                    "有失敗或需要老闆留意的事放最後並明確標註。全文控制在 350 字內，不要用 markdown 符號，條列用「•」開頭。",
                },
                { role: "user", content: rawBrief },
              ],
              temperature: 0.4,
            }),
          });
          if (!response.ok) return null;
          const data = await response.json();
          await logAiUsage({
            operation: "每日晨報摘要",
            model: "gpt-4o-mini",
            usage: data.usage,
            agentSlug: "teamlead",
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
    roster: {
      displayName(slug) {
        const agent = AGENTS.find((candidate) => candidate.slug === slug);
        return agent ? `${agent.personZh}（${agent.name}）` : slug;
      },
    },
  };
}
