import type { AgentGoal } from "@/lib/agent-goals";
import type { GoalsResetPort } from "./reset-ports";

export type GoalsResetResult = { kind: "ok"; data: AgentGoal[] };

export async function runGoalsReset(port: GoalsResetPort): Promise<GoalsResetResult> {
  return { kind: "ok", data: await port.reset() };
}
