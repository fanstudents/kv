import "server-only";
import { getTrafficOverview, type TrafficOverview } from "@/lib/ga4";
import type { AgentOverviewReadPort } from "@/modules/agents/overview-read-ports";

export function createLegacyTrafficOverviewAdapter(): AgentOverviewReadPort<TrafficOverview> {
  return {
    read(days = 7) {
      return getTrafficOverview(days);
    },
  };
}
