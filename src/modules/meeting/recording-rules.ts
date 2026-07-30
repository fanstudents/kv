export interface MeetingRecordingRequest {
  meetingId: string;
}

export function parseMeetingRecordingRequest(rawId: string | null): MeetingRecordingRequest {
  return { meetingId: rawId ?? "" };
}
