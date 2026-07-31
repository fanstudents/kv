export interface GoalsHistoryRequest {
  metricId: string | null;
  days: number;
}

export interface MetricHistoryPoint {
  metric_id: string;
  value: number;
  captured_at: string;
}

export function parseGoalsHistoryRequest(metricId: unknown, days: unknown): GoalsHistoryRequest {
  return {
    metricId: typeof metricId === "string" ? metricId : null,
    days: Math.min(180, Math.max(7, Number(days) || 30)),
  };
}
