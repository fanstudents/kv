import { NextRequest, NextResponse } from "next/server";
import { createOpenAiMeetingAudioProvider } from "@/adapters/meeting/openai-audio-provider";
import { parseMeetingSpeakRequest, speakMeeting } from "@/modules/meeting/audio";

// 把 Agent 的一句回覆合成語音（OpenAI TTS，取代瀏覽器內建 speechSynthesis——
// 聽起來自然許多，且每位 Agent 可配到不同、聽起來像真人的嗓音）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await speakMeeting(
    parseMeetingSpeakRequest(body),
    createOpenAiMeetingAudioProvider(),
  );

  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  if (result.kind === "provider-failed") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return new NextResponse(result.audio, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
