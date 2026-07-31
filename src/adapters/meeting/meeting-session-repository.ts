import "server-only";

import {
  appendTurns,
  createMeeting,
  finishMeeting,
  getRecentHistory,
  getSignedRecordingUrl,
  uploadRecording,
} from "@/lib/meeting-store";
import type { MeetingSessionRepository } from "@/modules/meeting/session";

export function createMeetingSessionRepository(): MeetingSessionRepository {
  return {
    create(title) {
      return createMeeting(title);
    },
    getHistory(meetingId, limit) {
      return getRecentHistory(meetingId, limit);
    },
    appendTurns(meetingId, turns) {
      return appendTurns(meetingId, turns);
    },
    uploadRecording(meetingId, bytes, ext, contentType) {
      return uploadRecording(meetingId, bytes, ext, contentType);
    },
    finishMeeting(meetingId, fields) {
      return finishMeeting(meetingId, fields);
    },
    getSignedRecordingUrl(meetingId) {
      return getSignedRecordingUrl(meetingId);
    },
  };
}
