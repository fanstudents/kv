import type { MeetingTranscribePort } from "./transcribe-ports";
import type { MeetingTranscribeRequest } from "./transcribe-rules";

export type MeetingTranscribeResult =
  | { kind: "invalid"; message: "缺少音訊檔案" }
  | { kind: "provider-failed"; message: string }
  | { kind: "ok"; text: string };

export async function runMeetingTranscribe(
  input: MeetingTranscribeRequest,
  port: MeetingTranscribePort,
): Promise<MeetingTranscribeResult> {
  if (!input.audio) return { kind: "invalid", message: "缺少音訊檔案" };

  try {
    const text = await port.transcribe({ audio: input.audio, promptHint: input.promptHint });
    return { kind: "ok", text };
  } catch (error) {
    return {
      kind: "provider-failed",
      message: error instanceof Error ? error.message : "語音辨識失敗",
    };
  }
}
