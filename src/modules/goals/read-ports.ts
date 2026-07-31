import type { AgentGoal } from "@/lib/agent-goals";

export interface GoalsReadPort {
  list(): Promise<AgentGoal[]>;
}
