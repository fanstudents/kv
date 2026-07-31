import { NextRequest, NextResponse } from "next/server";
import { createMeetingSessionRepository } from "@/adapters/meeting/meeting-session-repository";
import { finishMeetingSession, parseMeetingFinishForm } from "@/modules/meeting/session";

// 結束會議：上傳整場錄音（multipart）到 Storage，並補上逐字稿、時長與統整。
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "需要 multipart/form-data" }, { status: 400 });
  }

  const result = await finishMeetingSession(
    parseMeetingFinishForm(form),
    createMeetingSessionRepository()
  );
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, recordingSaved: result.recordingSaved });
}
