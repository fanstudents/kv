import "server-only";
import { appendTurns, getRecentHistory } from "@/lib/meeting-store";
import { replyAsAgent, runMeetingRound } from "@/lib/openai";
import type { MeetingCommandPorts } from "@/modules/meeting/command-ports";

export function createLegacyMeetingCommandAdapter(): MeetingCommandPorts {
  return {
    history: {
      load(meetingId, limit) {
        return getRecentHistory(meetingId, limit);
      },
    },
    replies: {
      oneToOne(input) {
        return replyAsAgent({
          agent: input.agent,
          command: input.command,
          history: input.history,
          isTeamLead: input.isTeamLead,
        });
      },
      round(input) {
        return runMeetingRound(input);
      },
    },
    turns: {
      append(meetingId, turns) {
        return appendTurns(meetingId, turns);
      },
    },
  };
}
