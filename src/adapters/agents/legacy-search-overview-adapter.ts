import "server-only";
import { getSearchOverview, type SearchOverview } from "@/lib/gsc";
import type { AgentOverviewReadPort } from "@/modules/agents/overview-read-ports";

export function createLegacySearchOverviewAdapter(): AgentOverviewReadPort<SearchOverview> {
  return {
    read(days = 7) {
      return getSearchOverview(days);
    },
  };
}
