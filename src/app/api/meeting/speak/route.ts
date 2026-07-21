import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/openai";

// 把 Agent 的一句回覆合成語音（OpenAI TTS，取代瀏覽器內建 speechSynthesis——
// 聽起來自然許多，且每位 Agent 可配到不同、聽起來像真人的嗓音）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voice = typeof body.voice === "string" ? body.voice : "alloy";
  const instructions = typeof body.instructions === "string" ? body.instructions : undefined;
  if (!text) return NextResponse.json({ error: "缺少文字內容" }, { status: 400 });

  try {
    const audio = await synthesizeSpeech({ text, voice, instructions });
    return new NextResponse(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "語音合成失敗";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
