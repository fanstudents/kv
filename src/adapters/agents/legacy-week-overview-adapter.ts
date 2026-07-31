import "server-only";
import { listWeekOverview, type WeekOverview } from "@/lib/google";
import type { AgentOverviewReadPort } from "@/modules/agents/overview-read-ports";

export function createLegacyWeekOverviewAdapter(): AgentOverviewReadPort<WeekOverview> {
  return {
    read() {
      return listWeekOverview();
    },
  };
}
