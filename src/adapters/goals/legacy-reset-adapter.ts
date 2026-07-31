import "server-only";
import { resetGoalsToDefault } from "@/lib/agent-goals-server";
import type { GoalsResetPort } from "@/modules/goals/reset-ports";

export function createLegacyGoalsResetAdapter(): GoalsResetPort {
  return { reset: resetGoalsToDefault };
}
