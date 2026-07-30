import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/agent-data";
import { createLegacyMeetingCommandAdapter } from "@/adapters/meeting/legacy-command-adapter";
import {
  parseMeetingCommandRequest,
  selectMeetingRoster,
  findActiveMeetingAgent,
} from "@/modules/meeting/command-rules";
import { runMeetingCommand } from "@/modules/meeting/command-application";

// 老闆下了一句語音指令 → 相關 Agent 各自回覆、Team Lead 統整，並寫進會議紀錄。
// 帶 targetSlug 時＝一對一輪流模式：只讓「目前這位」Agent 回覆（並語音朗讀）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = parseMeetingCommandRequest(body);
  if (!input) {
    return NextResponse.json({ error: "缺少 meetingId 或 command" }, { status: 400 });
  }
  const { targetSlug } = input;
  const ports = createLegacyMeetingCommandAdapter();
  const { teamLead, responders } = selectMeetingRoster(AGENTS);
  const target = targetSlug ? findActiveMeetingAgent(AGENTS, targetSlug) : null;
  const result = await runMeetingCommand(input, { teamLead, responders, target }, ports);
  if (result.kind === "teamlead-not-found") {
    return NextResponse.json({ error: "找不到 Team Lead" }, { status: 500 });
  }
  if (result.kind === "target-not-found") {
    return NextResponse.json({ error: "找不到這位 Agent" }, { status: 404 });
  }
  if (result.kind === "reply-failed") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }
  if (result.kind === "one-to-one") {
    return NextResponse.json({ reply: result.reply });
  }
  return NextResponse.json({ replies: result.replies, teamlead: result.teamlead });
}
