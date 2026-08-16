import "server-only";

import { getMainSupabase } from "@/lib/supabase";
import type {
  RunArtifactRow,
  RunDetail,
  RunHistoryRepository,
  RunHistoryRow,
  RunStatus,
  RunStepRow,
  RunUsageRow,
} from "@/modules/agent-runtime/history";

const RUN_FIELDS =
  "id,agent_slug,trigger,trigger_ref,status,started_at,ended_at,cost_usd,total_tokens,summary,error_kind,error_detail,retry_count,parent_run_id";

function mapRun(row: Record<string, unknown>): RunHistoryRow {
  return {
    id: String(row.id),
    agentSlug: String(row.agent_slug),
    trigger: String(row.trigger),
    triggerRef: row.trigger_ref ? String(row.trigger_ref) : null,
    status: row.status as RunStatus,
    startedAt: String(row.started_at),
    endedAt: row.ended_at ? String(row.ended_at) : null,
    costUsd: Number(row.cost_usd) || 0,
    totalTokens: Number(row.total_tokens) || 0,
    summary: row.summary ? String(row.summary) : null,
    errorKind: row.error_kind ? String(row.error_kind) : null,
    errorDetail: row.error_detail ? String(row.error_detail) : null,
    retryCount: Number(row.retry_count) || 0,
    parentRunId: row.parent_run_id ? String(row.parent_run_id) : null,
  };
}

export function createSupabaseRunHistoryRepository(): RunHistoryRepository {
  return {
    async list(params) {
      let query = getMainSupabase()
        .from("agent_runs")
        .select(RUN_FIELDS)
        .order("started_at", { ascending: false })
        .limit(params.limit);

      if (params.agentSlug) query = query.eq("agent_slug", params.agentSlug);
      if (params.status) query = query.eq("status", params.status);

      const { data, error } = await query;
      if (error) throw new Error(`無法讀取執行紀錄：${error.message}`);
      return (data ?? []).map((row) => mapRun(row as Record<string, unknown>));
    },

    async detail(runId) {
      const supabase = getMainSupabase();
      const [runResult, stepsResult, artifactsResult, usageResult] = await Promise.all([
        supabase.from("agent_runs").select(RUN_FIELDS).eq("id", runId).maybeSingle(),
        supabase
          .from("agent_run_steps")
          .select("id,node_id,seq,status,input_summary,output_summary,duration_ms,started_at")
          .eq("run_id", runId)
          .order("started_at", { ascending: true }),
        supabase
          .from("agent_artifacts")
          .select("id,kind,title,content,uri,created_at")
          .eq("run_id", runId)
          .order("created_at", { ascending: true }),
        supabase
          .from("ai_usage_logs")
          .select("operation,model,total_tokens,cost_usd,created_at")
          .eq("run_id", runId)
          .order("created_at", { ascending: true }),
      ]);

      for (const result of [runResult, stepsResult, artifactsResult, usageResult]) {
        if (result.error) throw new Error(`無法讀取執行細節：${result.error.message}`);
      }
      if (!runResult.data) return null;

      return {
        run: mapRun(runResult.data as Record<string, unknown>),
        steps: (stepsResult.data ?? []).map((row): RunStepRow => ({
          id: row.id,
          nodeId: row.node_id,
          sequence: row.seq,
          status: row.status,
          inputSummary: row.input_summary,
          outputSummary: row.output_summary,
          durationMs: row.duration_ms,
          startedAt: row.started_at,
        })),
        artifacts: (artifactsResult.data ?? []).map((row): RunArtifactRow => ({
          id: row.id,
          kind: row.kind,
          title: row.title,
          content: row.content,
          uri: row.uri,
          createdAt: row.created_at,
        })),
        usage: (usageResult.data ?? []).map((row): RunUsageRow => ({
          operation: row.operation,
          model: row.model,
          totalTokens: row.total_tokens,
          costUsd: Number(row.cost_usd) || 0,
          createdAt: row.created_at,
        })),
      } satisfies RunDetail;
    },
  };
}
