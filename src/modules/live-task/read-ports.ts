import type { LiveTaskStateSnapshot, LiveTaskStepSnapshot } from "./read-rules";

export interface LiveTaskReadPort {
  getTaskState(agentSlug: string): Promise<LiveTaskStateSnapshot | null>;
  getCurrentStep(agentSlug: string): Promise<LiveTaskStepSnapshot | null>;
}
