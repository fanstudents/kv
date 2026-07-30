import { NextRequest, NextResponse } from "next/server";
import { createLegacyMeetingTranscribeAdapter } from "@/adapters/meeting/legacy-transcribe-adapter";
import { runMeetingTranscribe } from "@/modules/meeting/transcribe-application";
import { parseMeetingTranscribeForm } from "@/modules/meeting/transcribe-rules";

// 把會議中「一段話」的錄音片段轉成文字（OpenAI 語音辨識，取代瀏覽器內建的
// Web Speech API——準確度高很多，尤其中文口語與專有名詞）。
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "需要 multipart/form-data" }, { status: 400 });
  }

  const result = await runMeetingTranscribe(
    parseMeetingTranscribeForm(form),
    createLegacyMeetingTranscribeAdapter(),
  );

  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  if (result.kind === "provider-failed") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json({ text: result.text });
}
