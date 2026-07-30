import type { AiUsageRow } from "./report-rules";

export interface AiUsageBudgetSide {
  spent: number;
  limit: number;
}

export interface AiUsageBudgetStatus {
  daily: AiUsageBudgetSide;
  monthly: AiUsageBudgetSide;
}

export interface AiUsageReadPort {
  listRows(limit: number): Promise<{
    data: AiUsageRow[];
    error: { message: string } | null;
  }>;
  getBudgetStatus(): Promise<AiUsageBudgetStatus>;
}
