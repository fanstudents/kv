import { NextRequest, NextResponse } from "next/server";
import { createLegacyMeetingSpeakAdapter } from "@/adapters/meeting/legacy-speak-adapter";
import { runMeetingSpeak } from "@/modules/meeting/speak-application";
import { parseMeetingSpeakRequest } from "@/modules/meeting/speak-rules";

// 把 Agent 的一句回覆合成語音（OpenAI TTS，取代瀏覽器內建 speechSynthesis——
// 聽起來自然許多，且每位 Agent 可配到不同、聽起來像真人的嗓音）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await runMeetingSpeak(
    parseMeetingSpeakRequest(body),
    createLegacyMeetingSpeakAdapter(),
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
