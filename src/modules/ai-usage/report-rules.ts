export interface AiUsageRow {
  agent_slug: string | null;
  operation: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
  [key: string]: unknown;
}

export interface AiUsageSummary {
  count: number;
  tokens: number;
  cost: number;
}

export interface AiUsageOperationSummary extends AiUsageSummary {
  operation: string;
  model: string;
}

export interface AiUsageModelSummary extends AiUsageSummary {
  model: string;
}

export interface AiUsageReport {
  total: AiUsageSummary;
  last30: AiUsageSummary;
  last7: AiUsageSummary;
  operations: AiUsageOperationSummary[];
  models: AiUsageModelSummary[];
  recent: AiUsageRow[];
}

function summarizeRows(rows: readonly AiUsageRow[]): AiUsageSummary {
  return {
    count: rows.length,
    tokens: rows.reduce((sum, row) => sum + (row.total_tokens ?? 0), 0),
    cost: rows.reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0),
  };
}

export function summarizeAiUsage(rows: readonly AiUsageRow[], now = Date.now()): AiUsageReport {
  const cutoff30 = now - 30 * 24 * 60 * 60 * 1000;
  const cutoff7 = now - 7 * 24 * 60 * 60 * 1000;
  const recent30 = rows.filter((row) => new Date(row.created_at).getTime() >= cutoff30);
  const recent7 = rows.filter((row) => new Date(row.created_at).getTime() >= cutoff7);

  const byOperation = new Map<string, AiUsageRow[]>();
  for (const row of rows) {
    const list = byOperation.get(row.operation) ?? [];
    list.push(row);
    byOperation.set(row.operation, list);
  }
  const operations = [...byOperation.entries()]
    .map(([operation, list]) => ({ operation, model: list[0]?.model ?? "", ...summarizeRows(list) }))
    .sort((left, right) => right.cost - left.cost);

  const byModel = new Map<string, AiUsageRow[]>();
  for (const row of rows) {
    const list = byModel.get(row.model) ?? [];
    list.push(row);
    byModel.set(row.model, list);
  }
  const models = [...byModel.entries()]
    .map(([model, list]) => ({ model, ...summarizeRows(list) }))
    .sort((left, right) => right.cost - left.cost);

  return {
    total: summarizeRows(rows),
    last30: summarizeRows(recent30),
    last7: summarizeRows(recent7),
    operations,
    models,
    recent: rows.slice(0, 50),
  };
}
