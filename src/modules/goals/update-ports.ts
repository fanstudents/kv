import type { AgentGoal } from "@/lib/agent-goals";

export interface GoalUpdatePort {
  upsert(goal: AgentGoal): Promise<AgentGoal>;
}
