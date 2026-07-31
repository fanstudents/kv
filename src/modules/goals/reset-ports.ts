import type { AgentGoal } from "@/lib/agent-goals";

export interface GoalsResetPort {
  reset(): Promise<AgentGoal[]>;
}
