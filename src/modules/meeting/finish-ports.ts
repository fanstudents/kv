export interface MeetingFinishFields {
  transcript?: string;
  durationSeconds?: number;
  recordingPath?: string | null;
}

export interface MeetingFinishPort {
  uploadRecording(
    meetingId: string,
    bytes: ArrayBuffer,
    ext: string,
    contentType: string
  ): Promise<string | null>;
  finishMeeting(meetingId: string, fields: MeetingFinishFields): Promise<void>;
}
