import "server-only";

import { logRealtimeUsage, type RealtimeUsage } from "@/lib/ai-usage";
import type { MeetingRealtimeUsageRepository } from "@/modules/meeting/realtime";

export function createMeetingRealtimeUsageRepository(): MeetingRealtimeUsageRepository {
  return {
    record(input) {
      return logRealtimeUsage({
        agentSlug: input.agentSlug,
        model: input.model,
        usage: input.usage as RealtimeUsage,
      });
    },
  };
}
