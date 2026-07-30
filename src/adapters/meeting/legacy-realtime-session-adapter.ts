import "server-only";
import { getAgentDemoContext } from "@/lib/meeting-demo-context";
import { getAgentLiveContext } from "@/lib/meeting-context";
import { getRecentHistory } from "@/lib/meeting-store";
import { mintRealtimeSession } from "@/lib/openai";
import type { RealtimeSessionPorts } from "@/modules/meeting/realtime-session-ports";

export function createLegacyRealtimeSessionAdapter(): RealtimeSessionPorts {
  return {
    history: {
      load(meetingId, limit) {
        return getRecentHistory(meetingId, limit);
      },
    },
    context: {
      demo(agentSlug) {
        return getAgentDemoContext(agentSlug);
      },
      live(agentSlug) {
        return getAgentLiveContext(agentSlug);
      },
    },
    provider: {
      mint(input) {
        return mintRealtimeSession(input);
      },
    },
  };
}
