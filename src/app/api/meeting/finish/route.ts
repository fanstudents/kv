import { NextRequest, NextResponse } from "next/server";
import { finishMeeting, uploadRecording, meetingRunId } from "@/lib/meeting-store";
import { finishRun, saveArtifact } from "@/lib/agent-runs";
import { remember } from "@/lib/agent-memory";

// 結束會議：上傳整場錄音（multipart）到 Storage，並補上逐字稿、時長與統整。
// 同時把這場會議的那次執行結案——不結案的話它會一直掛在「執行中」，
// 劇院模式的即時進度也會永遠停在最後一句。
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
    } catch (err) {
      console.error("[meeting] 錄音上傳失敗", { meetingId, err });
      recordingPath = null;
    }
  }

  await finishMeeting(meetingId, {
    transcript,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : undefined,
    recordingPath,
  });

  const runId = await meetingRunId(meetingId);
  const minutes = Number.isFinite(durationSeconds) ? Math.round((durationSeconds as number) / 60) : null;

  if (transcript) {
    await saveArtifact({
      agentSlug: "teamlead",
      kind: "doc",
      title: `會議逐字稿（${minutes !== null ? `${minutes} 分鐘` : meetingId.slice(0, 8)}）`,
      content: transcript,
      runId,
      meta: { meetingId, recordingPath, durationSeconds },
    });

    // 會議結論屬於全隊：其他 Agent 之後回話時看得到「上次開會決定了什麼」
    await remember({
      content: `會議紀錄（${minutes !== null ? `${minutes} 分鐘` : "時長不明"}）：${transcript.replace(/\s+/g, " ").slice(0, 300)}`,
      scope: "team",
      kind: "semantic",
      sourceRunId: runId,
      ttlDays: 90,
      confidence: 0.75,
    });
  }

  await finishRun(runId, {
    status: "success",
    summary: `會議結束${minutes !== null ? `，時長 ${minutes} 分鐘` : ""}${recordingPath ? "，已存錄音" : ""}`,
  });

  return NextResponse.json({ ok: true, recordingSaved: Boolean(recordingPath) });
}
