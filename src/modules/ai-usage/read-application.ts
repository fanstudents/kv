import type { AiUsageReadPort } from "./read-ports";
import { summarizeAiUsage, type AiUsageReport } from "./report-rules";

export type AiUsageReadResult =
  | { kind: "query-failed"; message: string }
  | { kind: "ok"; report: AiUsageReport & { budget: Awaited<ReturnType<AiUsageReadPort["getBudgetStatus"]>> } };

export async function runAiUsageRead(
  port: AiUsageReadPort,
  now = Date.now(),
): Promise<AiUsageReadResult> {
  const result = await port.listRows(2000);
  if (result.error) return { kind: "query-failed", message: result.error.message };

  const report = summarizeAiUsage(result.data, now);
  const budget = await port.getBudgetStatus();
  return { kind: "ok", report: { ...report, budget } };
}
