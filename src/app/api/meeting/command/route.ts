import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/agent-data";
import { createLegacyMeetingCommandAdapter } from "@/adapters/meeting/legacy-command-adapter";
import {
  displayName,
  findActiveMeetingAgent,
  parseMeetingCommandRequest,
  selectMeetingRoster,
  TEAM_LEAD_SLUG,
  toMeetingAgentInput,
  withMeetingReplyFallback,
} from "@/modules/meeting/command-rules";
import type { MeetingCommandRoundResult } from "@/modules/meeting/command-ports";

// 老闆下了一句語音指令 → 相關 Agent 各自回覆、Team Lead 統整，並寫進會議紀錄。
// 帶 targetSlug 時＝一對一輪流模式：只讓「目前這位」Agent 回覆（並語音朗讀）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = parseMeetingCommandRequest(body);
  if (!input) {
    return NextResponse.json({ error: "缺少 meetingId 或 command" }, { status: 400 });
  }
  const { meetingId, command, targetSlug } = input;
  const ports = createLegacyMeetingCommandAdapter();

  const { teamLead: teamLeadMeta, responders } = selectMeetingRoster(AGENTS);
  if (!teamLeadMeta) return NextResponse.json({ error: "找不到 Team Lead" }, { status: 500 });

  let history = "";
  try {
      history = await ports.history.load(meetingId);
  } catch {
    // 脈絡取不到不影響回應
  }

  // ── 一對一輪流：只讓目前這位 Agent 回覆 ──
  if (targetSlug) {
    const target = findActiveMeetingAgent(AGENTS, targetSlug);
    if (!target) return NextResponse.json({ error: "找不到這位 Agent" }, { status: 404 });
    let text: string;
    try {
      text = await ports.replies.oneToOne({
        agent: toMeetingAgentInput(target),
        command,
        history,
        isTeamLead: target.slug === TEAM_LEAD_SLUG,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "會議回應失敗";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    const name = displayName(target);
    text = withMeetingReplyFallback(text);
    try {
      await ports.turns.append(meetingId, [
        { role: "boss", speaker: "老闆", content: command },
        {
          role: target.slug === TEAM_LEAD_SLUG ? "teamlead" : "agent",
          agentSlug: target.slug,
          speaker: name,
          content: text,
        },
      ]);
    } catch {
      // 紀錄寫入失敗不影響當下演出
    }
    return NextResponse.json({ reply: { slug: target.slug, name, text } });
  }

  let result: MeetingCommandRoundResult;
  try {
    result = await ports.replies.round({
      command,
      teamLead: toMeetingAgentInput(teamLeadMeta),
      agents: responders.map(toMeetingAgentInput),
      history,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "會議回應失敗";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // 補上顯示名稱後回傳給前端
  const nameBySlug = new Map<string, string>(AGENTS.map((a) => [a.slug, displayName(a)]));
  const replies = result.replies.map((r) => ({
    slug: r.slug,
    name: nameBySlug.get(r.slug) ?? r.slug,
    text: r.text,
  }));

  // 寫進會議紀錄：老闆指令 → 各 Agent 回覆 → Team Lead 統整
  try {
    await ports.turns.append(meetingId, [
      { role: "boss", speaker: "老闆", content: command },
      ...replies.map((r) => ({ role: "agent" as const, agentSlug: r.slug, speaker: r.name, content: r.text })),
      {
        role: "teamlead" as const,
        agentSlug: TEAM_LEAD_SLUG,
        speaker: displayName(teamLeadMeta),
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
      name: displayName(teamLeadMeta),
      text: result.teamlead,
    },
  });
}
