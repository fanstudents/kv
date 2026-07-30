import { NextRequest, NextResponse } from "next/server";
import { createLegacyMeetingRecordingAdapter } from "@/adapters/meeting/legacy-recording-adapter";
import { runMeetingRecording } from "@/modules/meeting/recording-application";
import { parseMeetingRecordingRequest } from "@/modules/meeting/recording-rules";

// 回傳某場會議錄音檔的臨時可存取連結（signed URL），供回放／下載。
export async function GET(req: NextRequest) {
  const result = await runMeetingRecording(
    parseMeetingRecordingRequest(req.nextUrl.searchParams.get("id")),
    createLegacyMeetingRecordingAdapter()
  );
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  if (result.kind === "not-found") {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }
  return NextResponse.json({ url: result.url });
}
