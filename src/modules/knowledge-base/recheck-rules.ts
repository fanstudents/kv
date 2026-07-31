import { parseCronAuth, type CronAuthDecision } from "@/modules/cron/auth-rules";

export type KnowledgeBaseRecheckAuthDecision = CronAuthDecision;

export function parseKnowledgeBaseRecheckAuth(
  expectedSecret: string | undefined,
  providedSecret: string | null
): KnowledgeBaseRecheckAuthDecision {
  return parseCronAuth(expectedSecret, providedSecret);
}
