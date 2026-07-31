import type { AgentGoal } from "@/lib/agent-goals";
import type { GoalsReadPort } from "./read-ports";

export type GoalsReadResult = { kind: "ok"; data: AgentGoal[] };

export async function runGoalsRead(port: GoalsReadPort): Promise<GoalsReadResult> {
  return { kind: "ok", data: await port.list() };
}
