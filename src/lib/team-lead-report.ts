import "server-only";
import { getSupabase } from "@/lib/supabase";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages, type PushStyle } from "@/lib/line-message-styles";
import { logAiUsage } from "@/lib/ai-usage";
import { AGENTS } from "@/lib/agent-data";

const OPENAI_API_BASE = "https://api.openai.com/v1";

interface ActivityRow {
  agent_slug: string | null;
  occurred_at: string;
  summary: string;
  status: "success" | "failed" | "pending";
}

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
  if (agentRow && agentRow.enabled === false) {
    return { ok: false, message: "總管 Agent 已停用，略過匯報" };
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
    .from("line_agent_activity")
    .select("agent_slug, occurred_at, summary, status")
    .gte("occurred_at", cutoff)
    .neq("agent_slug", "teamlead")
    .order("occurred_at", { ascending: false })
    .limit(200);

  const activity = (rows ?? []) as ActivityRow[];
  const meaningful = activity.filter((r) => r.agent_slug && !r.summary.includes("草稿狀態"));

  const dateLabel = new Date().toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  let reportText: string;

  if (meaningful.length === 0) {
    reportText = `${dateLabel} 晨報\n\n過去 24 小時團隊沒有新的執行紀錄，各位成員待命中。有新任務進來我會隨時盯著，請老闆放心。`;
  } else {
    const bySlug = new Map<string, ActivityRow[]>();
    for (const row of meaningful) {
      const list = bySlug.get(row.agent_slug as string) ?? [];
      list.push(row);
      bySlug.set(row.agent_slug as string, list);
    }

    const successCount = meaningful.filter((r) => r.status === "success").length;
    const failedCount = meaningful.filter((r) => r.status === "failed").length;

    const lines: string[] = [`統計：完成 ${successCount} 件、失敗 ${failedCount} 件、共 ${meaningful.length} 筆動作`];
    for (const [slug, list] of bySlug) {
      lines.push(`\n${agentDisplayName(slug)}：`);
      for (const row of list.slice(0, 6)) {
        lines.push(`- [${row.status}] ${row.summary}`);
      }
    }

    const rawBrief = lines.join("\n");
    const aiSummary = await summarizeWithAI(rawBrief);
    reportText = `${dateLabel} 晨報\n\n${aiSummary ?? rawBrief}`;
  }

  try {
    await pushLineRawMessages(
      reportTo,
      buildPushMessages({
        style: pushStyle,
        text: reportText,
        title: "總管 Agent・每日晨報",
        accentColor: "#475569",
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
    summary: `已向老闆送出每日晨報（彙整 ${meaningful.length} 筆團隊動態）`,
    status: "success",
  });

  return { ok: true, message: `晨報已送出，彙整 ${meaningful.length} 筆團隊動態` };
}
