export interface MeetingRecordingPort {
  getSignedUrl(meetingId: string): Promise<string | null>;
}
