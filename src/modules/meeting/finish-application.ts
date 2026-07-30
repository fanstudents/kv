import type { MeetingFinishPort } from "./finish-ports";
import type { MeetingFinishRequest } from "./finish-rules";
import { recordingDescriptor } from "./finish-rules";

export type MeetingFinishResult =
  | { kind: "invalid"; message: "缺少 meetingId" }
  | { kind: "ok"; recordingSaved: boolean };

export async function runMeetingFinish(
  input: MeetingFinishRequest,
  port: MeetingFinishPort
): Promise<MeetingFinishResult> {
  if (!input.meetingId) return { kind: "invalid", message: "缺少 meetingId" };

  let recordingPath: string | null = null;
  if (input.audio) {
    // Keep descriptor calculation outside the upload try boundary, matching the
    // existing route's handling of an invalid file type value.
    const { ext, contentType } = recordingDescriptor(input.audio);
    try {
      const bytes = await input.audio.arrayBuffer();
      recordingPath = await port.uploadRecording(input.meetingId, bytes, ext, contentType);
    } catch {
      recordingPath = null;
    }
  }

  await port.finishMeeting(input.meetingId, {
    transcript: input.transcript,
    durationSeconds: Number.isFinite(input.durationSeconds) ? input.durationSeconds : undefined,
    recordingPath,
  });

  return { kind: "ok", recordingSaved: Boolean(recordingPath) };
}
