import "server-only";
import { getSupabase } from "@/lib/supabase";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages, type PushStyle } from "@/lib/line-message-styles";
import { logAiUsage } from "@/lib/ai-usage";
import { AGENTS } from "@/lib/agent-data";
import {
  finalizeTeamLeadReport,
  planTeamLeadDelivery,
  prepareTeamLeadReport,
  teamLeadActivityCutoff,
  type ReportingActivity,
} from "@/modules/reporting/daily-report";

const OPENAI_API_BASE = "https://api.openai.com/v1";

function agentDisplayName(slug: string): string {
  const agent = AGENTS.find((a) => a.slug === slug);
  return agent ? `${agent.personZh}（${agent.name}）` : slug;
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
              "你是 AI 團隊的大總管薇薇安，每天早上向老闆匯報。請用繁體中文，以簡潔幹練、稍帶溫度的主管口吻，" +
              "將以下團隊活動整理成一段晨報：先一句總結整體狀況，再條列每位有動作的成員做了什麼（每人一行、用成員名字開頭），" +
              "有失敗或需要老闆留意的事放最後並明確標註。全文控制在 350 字內，不要用 markdown 符號，條列用「•」開頭。",
          },
          { role: "user", content: rawBrief },
        ],
        temperature: 0.4,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    await logAiUsage({ operation: "每日晨報摘要", model: "gpt-4o-mini", usage: data.usage, agentSlug: "teamlead" });
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function runTeamLeadReport(): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabase();

  const { data: agentRow } = await supabase.from("line_agents").select("enabled, settings").eq("slug", "teamlead").single();
  const deliveryPlan = planTeamLeadDelivery(agentRow);
  if (deliveryPlan.type !== "deliver") {
    return { ok: false, message: deliveryPlan.message };
  }

  const cutoff = teamLeadActivityCutoff(Date.now());
  const { data: rows } = await supabase
    .from("line_agent_activity")
    .select("agent_slug, occurred_at, summary, status")
    .gte("occurred_at", cutoff)
    .neq("agent_slug", "teamlead")
    .order("occurred_at", { ascending: false })
    .limit(200);

  const prepared = prepareTeamLeadReport(
    (rows ?? []) as ReportingActivity[],
    new Date(),
    agentDisplayName
  );
  const aiSummary = prepared.rawBrief ? await summarizeWithAI(prepared.rawBrief) : null;
  const reportText = finalizeTeamLeadReport(prepared, aiSummary);

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
      agent_slug: "teamlead",
      summary: `每日匯報推播失敗：${message}`,
      status: "failed",
    });
    return { ok: false, message };
  }

  await supabase.from("line_agent_activity").insert({
    agent_slug: "teamlead",
    summary: `已向老闆送出每日晨報（彙整 ${prepared.meaningful.length} 筆團隊動態）`,
    status: "success",
  });

  return { ok: true, message: `晨報已送出，彙整 ${prepared.meaningful.length} 筆團隊動態` };
}
