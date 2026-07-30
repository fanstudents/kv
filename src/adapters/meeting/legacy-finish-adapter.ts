import "server-only";
import { finishMeeting, uploadRecording } from "@/lib/meeting-store";
import type { MeetingFinishPort } from "@/modules/meeting/finish-ports";

export function createLegacyMeetingFinishAdapter(): MeetingFinishPort {
  return {
    uploadRecording(meetingId, bytes, ext, contentType) {
      return uploadRecording(meetingId, bytes, ext, contentType);
    },
    finishMeeting(meetingId, fields) {
      return finishMeeting(meetingId, fields);
    },
  };
}
