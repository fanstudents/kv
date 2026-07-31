import type { AgentGoal } from "@/lib/agent-goals";
import type { GoalUpdatePort } from "./update-ports";
import type { GoalUpdateParseResult } from "./update-rules";

export type GoalUpdateResult =
  | { kind: "invalid"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ok"; goal: AgentGoal };

export async function runGoalUpdate(
  parsed: GoalUpdateParseResult,
  port: GoalUpdatePort,
): Promise<GoalUpdateResult> {
  if (parsed.kind === "invalid") return parsed;
  try {
    const goal = await port.upsert(parsed.goal);
    return { kind: "ok", goal };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : "儲存失敗" };
  }
}
