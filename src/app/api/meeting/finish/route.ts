import { NextRequest, NextResponse } from "next/server";
import { finishMeeting, uploadRecording } from "@/lib/meeting-store";

// 結束會議：上傳整場錄音（multipart）到 Storage，並補上逐字稿、時長與統整。
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "需要 multipart/form-data" }, { status: 400 });
  }

  const meetingId = String(form.get("meetingId") ?? "");
  if (!meetingId) return NextResponse.json({ error: "缺少 meetingId" }, { status: 400 });

  const transcript = form.get("transcript") ? String(form.get("transcript")) : undefined;
  const durationRaw = form.get("durationSeconds");
  const durationSeconds = durationRaw ? Number(durationRaw) : undefined;

  let recordingPath: string | null = null;
  const audio = form.get("audio");
  if (audio && typeof audio === "object" && "arrayBuffer" in audio) {
    const file = audio as File;
    const contentType = file.type || "audio/webm";
    const ext = contentType.includes("mp4") ? "mp4" : contentType.includes("ogg") ? "ogg" : "webm";
    try {
      const bytes = await file.arrayBuffer();
      recordingPath = await uploadRecording(meetingId, bytes, ext, contentType);
    } catch {
      recordingPath = null;
    }
  }

  await finishMeeting(meetingId, {
    transcript,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : undefined,
    recordingPath,
  });

  return NextResponse.json({ ok: true, recordingSaved: Boolean(recordingPath) });
}
