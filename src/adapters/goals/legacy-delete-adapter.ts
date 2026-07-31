import "server-only";
import { deleteGoal } from "@/lib/agent-goals-server";
import type { GoalDeletePort } from "@/modules/goals/delete-ports";

export function createLegacyGoalDeleteAdapter(): GoalDeletePort {
  return { remove: deleteGoal };
}
