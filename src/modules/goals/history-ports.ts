import type { MetricHistoryPoint } from "./history-rules";

export interface GoalsHistoryPort {
  load(metricId: string, days: number): Promise<MetricHistoryPoint[]>;
}
