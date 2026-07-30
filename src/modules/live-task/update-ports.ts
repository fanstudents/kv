import type { LiveTaskUpdatePatch } from "./update-rules";

export interface LiveTaskUpdatePort {
  setState(agentSlug: string, patch: LiveTaskUpdatePatch): Promise<void>;
}
