import { NextRequest, NextResponse } from "next/server";
import { createMeetingSessionRepository } from "@/adapters/meeting/meeting-session-repository";
import { getMeetingRecording, parseMeetingRecordingRequest } from "@/modules/meeting/session";

// 回傳某場會議錄音檔的臨時可存取連結（signed URL），供回放／下載。
export async function GET(req: NextRequest) {
  const result = await getMeetingRecording(
    parseMeetingRecordingRequest(req.nextUrl.searchParams.get("id")),
    createMeetingSessionRepository()
  );
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  if (result.kind === "not-found") {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }
  return NextResponse.json({ url: result.url });
}
