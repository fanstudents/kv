import "server-only";
import { upsertGoal } from "@/lib/agent-goals-server";
import type { GoalUpdatePort } from "@/modules/goals/update-ports";

export function createLegacyGoalUpdateAdapter(): GoalUpdatePort {
  return { upsert: upsertGoal };
}
