import "server-only";
import { getPipelineOverview, type PipelineOverview } from "@/lib/teaching-system";
import type { AgentOverviewReadPort } from "@/modules/agents/overview-read-ports";

export function createLegacyPipelineOverviewAdapter(): AgentOverviewReadPort<PipelineOverview> {
  return {
    read() {
      return getPipelineOverview();
    },
  };
}
