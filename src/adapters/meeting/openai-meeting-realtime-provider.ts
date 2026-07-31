import "server-only";

import { mintRealtimeSession } from "@/lib/openai";
import type { RealtimeSessionProvider } from "@/modules/meeting/realtime";

export function createOpenAiMeetingRealtimeProvider(): RealtimeSessionProvider {
  return {
    mint(input) {
      return mintRealtimeSession(input);
    },
  };
}
