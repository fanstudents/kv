import "server-only";
import { currentStep } from "@/lib/agent-runs";
import { getLiveTaskState } from "@/lib/live-task-store";
import type { AgentSlug } from "@/lib/types";
import type { LiveTaskReadPort } from "@/modules/live-task/read-ports";

export function createLegacyLiveTaskReadAdapter(): LiveTaskReadPort {
  return {
    getTaskState(agentSlug) {
      return getLiveTaskState(agentSlug);
    },
    getCurrentStep(agentSlug) {
      return currentStep(agentSlug as AgentSlug);
    },
  };
}
