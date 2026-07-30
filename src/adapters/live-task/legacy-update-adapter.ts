import "server-only";
import { setLiveTask } from "@/lib/live-task-store";
import type { LiveTaskUpdatePort } from "@/modules/live-task/update-ports";

export function createLegacyLiveTaskUpdateAdapter(): LiveTaskUpdatePort {
  return {
    setState(agentSlug, patch) {
      return setLiveTask(agentSlug, patch);
    },
  };
}
