import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/openai";

// 把 Agent 的一句回覆合成語音（OpenAI TTS，取代瀏覽器內建 speechSynthesis——
// 聽起來自然許多，且每位 Agent 可配到不同、聽起來像真人的嗓音）。
// 預設語音風格：明快俐落的會議節奏（gpt-4o-mini-tts 靠 instructions 控制語速與語氣）
const DEFAULT_INSTRUCTIONS =
  "用明快、俐落、稍快的語速說話，像幹練的專業同事在會議上簡潔回報，語氣自然有精神，帶台灣口音的繁體中文。";
const DEFAULT_SPEED = 1.15;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voice = typeof body.voice === "string" ? body.voice : "alloy";
  const instructions = typeof body.instructions === "string" ? body.instructions : DEFAULT_INSTRUCTIONS;
  const speed = typeof body.speed === "number" ? body.speed : DEFAULT_SPEED;
  if (!text) return NextResponse.json({ error: "缺少文字內容" }, { status: 400 });

  try {
    const audio = await synthesizeSpeech({ text, voice, instructions, speed });
    return new NextResponse(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "語音合成失敗";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
