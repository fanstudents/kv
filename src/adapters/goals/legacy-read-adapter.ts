import "server-only";
import { listGoals } from "@/lib/agent-goals-server";
import type { GoalsReadPort } from "@/modules/goals/read-ports";

export function createLegacyGoalsReadAdapter(): GoalsReadPort {
  return { list: listGoals };
}
