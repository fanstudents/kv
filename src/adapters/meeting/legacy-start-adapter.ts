import "server-only";
import { createMeeting } from "@/lib/meeting-store";
import type { MeetingStartPort } from "@/modules/meeting/start-ports";

export function createLegacyMeetingStartAdapter(): MeetingStartPort {
  return {
    create(title) {
      return createMeeting(title);
    },
  };
}
