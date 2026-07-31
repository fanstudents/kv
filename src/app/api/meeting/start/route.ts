import { NextRequest, NextResponse } from "next/server";
import { createMeetingSessionRepository } from "@/adapters/meeting/meeting-session-repository";
import { parseMeetingStartRequest, startMeeting } from "@/modules/meeting/session";

// 開一場新會議，回傳 meeting id（前端接著用它送指令、結束時上傳錄音）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await startMeeting(
    parseMeetingStartRequest(body),
    createMeetingSessionRepository()
  );
  if (result.kind === "create-failed") {
    return NextResponse.json({ error: "無法建立會議" }, { status: 500 });
  }
  return NextResponse.json({ id: result.id });
}
