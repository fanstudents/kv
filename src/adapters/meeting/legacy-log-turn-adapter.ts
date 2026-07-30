import "server-only";
import { appendTurns } from "@/lib/meeting-store";
import type { MeetingTurnLogPort } from "@/modules/meeting/log-turn-ports";

export function createLegacyMeetingTurnLogAdapter(): MeetingTurnLogPort {
  return {
    append(input) {
      return appendTurns(input.meetingId, [
        {
          role: input.role,
          agentSlug: input.agentSlug,
          speaker: input.speaker,
          content: input.content,
        },
      ]);
    },
  };
}
