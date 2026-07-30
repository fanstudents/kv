import type { MeetingSpeakPort } from "./speak-ports";
import type { MeetingSpeakRequest } from "./speak-rules";

export type MeetingSpeakResult =
  | { kind: "invalid"; message: "缺少文字內容" }
  | { kind: "provider-failed"; message: string }
  | { kind: "ok"; audio: ArrayBuffer };

export async function runMeetingSpeak(
  input: MeetingSpeakRequest,
  port: MeetingSpeakPort,
): Promise<MeetingSpeakResult> {
  if (!input.text) return { kind: "invalid", message: "缺少文字內容" };

  try {
    const audio = await port.synthesize(input);
    return { kind: "ok", audio };
  } catch (error) {
    return {
      kind: "provider-failed",
      message: error instanceof Error ? error.message : "語音合成失敗",
    };
  }
}
