import "server-only";

import { getAgentDemoContext } from "@/lib/meeting-demo-context";
import { getAgentLiveContext } from "@/lib/meeting-context";
import type { RealtimeSessionContextProvider } from "@/modules/meeting/realtime";

export function createMeetingRealtimeContextProvider(): RealtimeSessionContextProvider {
  return {
    demo(agentSlug) {
      return getAgentDemoContext(agentSlug);
    },
    live(agentSlug) {
      return getAgentLiveContext(agentSlug);
    },
  };
}
