import type { GoalDeletePort } from "./delete-ports";
import type { GoalDeleteParseResult } from "./delete-rules";

export type GoalDeleteResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok" };

export async function runGoalDelete(
  parsed: GoalDeleteParseResult,
  port: GoalDeletePort,
): Promise<GoalDeleteResult> {
  if (parsed.kind === "invalid") return parsed;
  await port.remove(parsed.id);
  return { kind: "ok" };
}
