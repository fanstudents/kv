import "server-only";
import { logRealtimeUsage, type RealtimeUsage } from "@/lib/ai-usage";
import type { MeetingRealtimeUsageLogPort } from "@/modules/meeting/log-usage-ports";

export function createLegacyMeetingRealtimeUsageAdapter(): MeetingRealtimeUsageLogPort {
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
