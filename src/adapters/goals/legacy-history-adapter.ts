import "server-only";
import { metricHistory } from "@/lib/agent-memory";
import type { GoalsHistoryPort } from "@/modules/goals/history-ports";

export function createLegacyGoalsHistoryAdapter(): GoalsHistoryPort {
  return {
    load(metricId, days) {
      return metricHistory(metricId, days);
    },
  };
}
