import { NextRequest, NextResponse } from "next/server";
import { createLegacyMeetingStartAdapter } from "@/adapters/meeting/legacy-start-adapter";
import { runMeetingStart } from "@/modules/meeting/start-application";
import { parseMeetingStartRequest } from "@/modules/meeting/start-rules";

// 開一場新會議，回傳 meeting id（前端接著用它送指令、結束時上傳錄音）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await runMeetingStart(
    parseMeetingStartRequest(body),
    createLegacyMeetingStartAdapter()
  );
  if (result.kind === "create-failed") {
    return NextResponse.json({ error: "無法建立會議" }, { status: 500 });
  }
  return NextResponse.json({ id: result.id });
}
