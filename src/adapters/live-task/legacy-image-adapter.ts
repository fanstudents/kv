import "server-only";
import { getLiveImage } from "@/lib/live-task-store";
import type { LiveTaskImagePort } from "@/modules/live-task/image-ports";

export function createLegacyLiveTaskImageAdapter(): LiveTaskImagePort {
  return {
    getImage(agentSlug) {
      return getLiveImage(agentSlug);
    },
  };
}
