import type { GoalsHistoryPort } from "./history-ports";
import type { GoalsHistoryRequest } from "./history-rules";

export type GoalsHistoryResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; points: Awaited<ReturnType<GoalsHistoryPort["load"]>> };

export async function runGoalsHistory(
  input: GoalsHistoryRequest,
  port: GoalsHistoryPort,
): Promise<GoalsHistoryResult> {
  if (!input.metricId) return { kind: "invalid", message: "缺少 metricId" };
  return { kind: "ok", points: await port.load(input.metricId, input.days) };
}
