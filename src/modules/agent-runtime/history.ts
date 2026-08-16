export const RUN_STATUSES = ["running", "success", "failed", "waiting", "cancelled"] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export interface RunHistoryRow {
  id: string;
  agentSlug: string;
  trigger: string;
  triggerRef: string | null;
  status: RunStatus;
  startedAt: string;
  endedAt: string | null;
  costUsd: number;
  totalTokens: number;
  summary: string | null;
  errorKind: string | null;
  errorDetail: string | null;
  retryCount: number;
  parentRunId: string | null;
}

export interface RunStepRow {
  id: string;
  nodeId: string;
  sequence: number;
  status: string;
  inputSummary: string | null;
  outputSummary: string | null;
  durationMs: number | null;
  startedAt: string;
}

export interface RunArtifactRow {
  id: string;
  kind: string;
  title: string;
  content: string | null;
  uri: string | null;
  createdAt: string;
}

export interface RunUsageRow {
  operation: string;
  model: string;
  totalTokens: number;
  costUsd: number;
  createdAt: string;
}

export interface RunDetail {
  run: RunHistoryRow;
  steps: RunStepRow[];
  artifacts: RunArtifactRow[];
  usage: RunUsageRow[];
}

export interface RunHistoryRepository {
  list(params: { agentSlug?: string; status?: RunStatus; limit: number }): Promise<RunHistoryRow[]>;
  detail(runId: string): Promise<RunDetail | null>;
}

export function normalizeRunHistoryQuery(params: {
  agentSlug?: string;
  status?: string;
  limit?: number;
}): { agentSlug?: string; status?: RunStatus; limit: number } {
  const agentSlug = params.agentSlug?.trim() || undefined;
  const status = RUN_STATUSES.includes(params.status as RunStatus) ? (params.status as RunStatus) : undefined;
  const requestedLimit = Number.isFinite(params.limit) ? Math.trunc(params.limit as number) : 50;
  return {
    agentSlug,
    status,
    limit: Math.max(1, Math.min(requestedLimit, 200)),
  };
}

export function listRunHistory(
  repository: RunHistoryRepository,
  params: { agentSlug?: string; status?: string; limit?: number } = {},
): Promise<RunHistoryRow[]> {
  return repository.list(normalizeRunHistoryQuery(params));
}

export function getRunHistoryDetail(
  repository: RunHistoryRepository,
  runId: string,
): Promise<RunDetail | null> {
  const id = runId.trim();
  if (!id) return Promise.resolve(null);
  return repository.detail(id);
}
