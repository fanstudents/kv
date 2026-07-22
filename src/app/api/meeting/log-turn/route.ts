import { NextRequest, NextResponse } from "next/server";
import { appendTurns } from "@/lib/meeting-store";

// 即時語音會議是連續對話，沒有「一輪指令→一輪回覆」的批次呼叫可以順手寫紀錄，
// 所以前端每收到一句完整的話（老闆說的／Agent 回覆的）就個別呼叫這支路由存檔。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const meetingId = typeof body.meetingId === "string" ? body.meetingId : "";
  const role = body.role === "agent" || body.role === "teamlead" ? body.role : "boss";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const agentSlug = typeof body.agentSlug === "string" ? body.agentSlug : undefined;
  const speaker = typeof body.speaker === "string" ? body.speaker : undefined;

  if (!meetingId || !content) {
    return NextResponse.json({ error: "缺少 meetingId 或 content" }, { status: 400 });
  }

  try {
    await appendTurns(meetingId, [{ role, agentSlug, speaker, content }]);
  } catch {
    // 紀錄寫入失敗不影響會議進行
  }
  return NextResponse.json({ ok: true });
}
