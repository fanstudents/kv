import type { MeetingRecordingPort } from "./recording-ports";
import type { MeetingRecordingRequest } from "./recording-rules";

export type MeetingRecordingResult =
  | { kind: "invalid"; message: "缺少 id" }
  | { kind: "not-found"; message: "找不到錄音檔" }
  | { kind: "ok"; url: string };

export async function runMeetingRecording(
  input: MeetingRecordingRequest,
  port: MeetingRecordingPort
): Promise<MeetingRecordingResult> {
  if (!input.meetingId) return { kind: "invalid", message: "缺少 id" };

  const url = await port.getSignedUrl(input.meetingId);
  if (!url) return { kind: "not-found", message: "找不到錄音檔" };
  return { kind: "ok", url };
}
