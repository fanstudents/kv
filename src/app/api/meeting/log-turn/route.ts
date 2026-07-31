import { NextRequest, NextResponse } from "next/server";
import { createMeetingSessionRepository } from "@/adapters/meeting/meeting-session-repository";
import { logMeetingTurn, parseMeetingTurnLogRequest } from "@/modules/meeting/session";

// 即時語音會議是連續對話，沒有「一輪指令→一輪回覆」的批次呼叫可以順手寫紀錄，
// 所以前端每收到一句完整的話（老闆說的／Agent 回覆的）就個別呼叫這支路由存檔。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = parseMeetingTurnLogRequest(body);
  const result = await logMeetingTurn(input, createMeetingSessionRepository());

  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
