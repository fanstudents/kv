import "server-only";
import { getSignedRecordingUrl } from "@/lib/meeting-store";
import type { MeetingRecordingPort } from "@/modules/meeting/recording-ports";

export function createLegacyMeetingRecordingAdapter(): MeetingRecordingPort {
  return {
    getSignedUrl(meetingId) {
      return getSignedRecordingUrl(meetingId);
    },
  };
}
