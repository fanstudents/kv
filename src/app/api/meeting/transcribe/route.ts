import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/openai";

// 把會議中「一段話」的錄音片段轉成文字（OpenAI 語音辨識，取代瀏覽器內建的
// Web Speech API——準確度高很多，尤其中文口語與專有名詞）。
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "需要 multipart/form-data" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!audio || typeof audio !== "object" || !("arrayBuffer" in audio)) {
    return NextResponse.json({ error: "缺少音訊檔案" }, { status: 400 });
  }
  const promptHint = form.get("promptHint") ? String(form.get("promptHint")) : undefined;

  try {
    const text = await transcribeAudio({ file: audio as File, promptHint });
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "語音辨識失敗";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
