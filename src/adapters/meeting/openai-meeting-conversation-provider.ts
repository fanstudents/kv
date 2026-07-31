import "server-only";

import { replyAsAgent, runMeetingRound } from "@/lib/openai";
import type { MeetingConversationProvider } from "@/modules/meeting/conversation";

export function createOpenAiMeetingConversationProvider(): MeetingConversationProvider {
  return {
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
  };
}
