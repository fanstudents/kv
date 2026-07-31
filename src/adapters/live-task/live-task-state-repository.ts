import "server-only";
import { currentStep } from "@/lib/agent-runs";
import { getLiveImage, getLiveTaskState, setLiveTask } from "@/lib/live-task-store";
import type { AgentSlug } from "@/lib/types";
import type { LiveTaskStateRepository } from "@/modules/live-task/state";

export function createLiveTaskStateRepository(): LiveTaskStateRepository {
  return {
    getTaskState(agentSlug) {
      return getLiveTaskState(agentSlug);
    },
    getCurrentStep(agentSlug) {
      return currentStep(agentSlug as AgentSlug);
    },
    setState(agentSlug, patch) {
      return setLiveTask(agentSlug, patch);
    },
    getImage(agentSlug) {
      return getLiveImage(agentSlug);
    },
  };
}
