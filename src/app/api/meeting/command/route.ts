import { NextRequest, NextResponse } from "next/server";
import { runMeetingRound, type MeetingAgentInput } from "@/lib/openai";
import { appendTurns, getRecentHistory } from "@/lib/meeting-store";
import { AGENTS } from "@/lib/agent-data";

const TEAM_LEAD_SLUG = "teamlead";

function toInput(a: (typeof AGENTS)[number]): MeetingAgentInput {
  return {
    slug: a.slug,
    name: `${a.personEn} ${a.personZh}`,
    role: a.role,
    description: a.description,
  };
}

// 老闆下了一句語音指令 → 相關 Agent 各自回覆、Team Lead 統整，並寫進會議紀錄。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const meetingId = typeof body.meetingId === "string" ? body.meetingId : "";
  const command = typeof body.command === "string" ? body.command.trim() : "";
  if (!meetingId || !command) {
    return NextResponse.json({ error: "缺少 meetingId 或 command" }, { status: 400 });
  }

  const teamLeadMeta = AGENTS.find((a) => a.slug === TEAM_LEAD_SLUG);
  const responders = AGENTS.filter((a) => a.status === "active" && a.slug !== TEAM_LEAD_SLUG);
  if (!teamLeadMeta) return NextResponse.json({ error: "找不到 Team Lead" }, { status: 500 });

  let history = "";
  try {
    history = await getRecentHistory(meetingId);
  } catch {
    // 脈絡取不到不影響回應
  }

  let result: Awaited<ReturnType<typeof runMeetingRound>>;
  try {
    result = await runMeetingRound({
      command,
      teamLead: toInput(teamLeadMeta),
      agents: responders.map(toInput),
      history,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "會議回應失敗";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // 補上顯示名稱後回傳給前端
  const nameBySlug = new Map<string, string>(AGENTS.map((a) => [a.slug, `${a.personEn} ${a.personZh}`]));
  const replies = result.replies.map((r) => ({
    slug: r.slug,
    name: nameBySlug.get(r.slug) ?? r.slug,
    text: r.text,
  }));

  // 寫進會議紀錄：老闆指令 → 各 Agent 回覆 → Team Lead 統整
  try {
    await appendTurns(meetingId, [
      { role: "boss", speaker: "老闆", content: command },
      ...replies.map((r) => ({ role: "agent" as const, agentSlug: r.slug, speaker: r.name, content: r.text })),
      {
        role: "teamlead" as const,
        agentSlug: TEAM_LEAD_SLUG,
        speaker: `${teamLeadMeta.personEn} ${teamLeadMeta.personZh}`,
        content: result.teamlead,
      },
    ]);
  } catch {
    // 紀錄寫入失敗不影響當下演出
  }

  return NextResponse.json({
    replies,
    teamlead: {
      slug: TEAM_LEAD_SLUG,
      name: `${teamLeadMeta.personEn} ${teamLeadMeta.personZh}`,
      text: result.teamlead,
    },
  });
}
