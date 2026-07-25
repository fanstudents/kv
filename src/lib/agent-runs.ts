import "server-only";
import { getSupabase } from "./supabase";
import type { AgentSlug } from "./types";

// 「一次執行」的寫入層（agent_runs / agent_run_steps / agent_artifacts / agent_tasks）。
//
// 用法就是把既有的 webhook / cron / API route 包起來：
//   const run = await startRun({ agentSlug: "visit", trigger: "webhook", triggerRef: eventId });
//   await stepDone(run, "scan", { output: "辨識出 3 個欄位", tokens, costUsd });
//   await saveArtifact({ runId: run, agentSlug: "visit", kind: "mail", title: "邀約信", content: html });
//   await finishRun(run, { status: "success", summary: "已寄出邀約信" });
//
// 兩個關鍵設計：
// 1. step 的 nodeId 就是 agent-briefings.ts 裡流程圖節點的 id——流程圖畫的與實際跑的是同一份，
//    圖不會慢慢變成漂亮的謊言，而且劇院模式的即時進度可以直接從這裡讀。
// 2. triggerRef 有唯一索引：webhook 重送、cron 重跑不會變成第二次執行（冪等）。
// 全部 best-effort：記錄失敗絕不能把主流程弄掛。

export type RunTrigger = "schedule" | "webhook" | "manual" | "agent";
export type RunStatus = "running" | "success" | "failed" | "waiting" | "cancelled";
export type RunErrorKind = "external" | "data" | "model" | "timeout" | "unknown";
export type ArtifactKind =
  | "report"
  | "chart"
  | "doc"
  | "mail"
  | "calendar"
  | "post"
  | "message"
  | "alert";

/** 開一次執行。回傳 run id；已經跑過同一個 triggerRef 就回傳原本那次（冪等） */
export async function startRun(params: {
  agentSlug: AgentSlug;
  trigger: RunTrigger;
  /** 觸發來源識別（webhook event id、cron 名稱＋日期…）——同一個值只會有一次執行 */
  triggerRef?: string;
  goalId?: string;
  summary?: string;
  meta?: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const supabase = getSupabase();

    if (params.triggerRef) {
      const { data: existing } = await supabase
        .from("agent_runs")
        .select("id")
        .eq("agent_slug", params.agentSlug)
        .eq("trigger_ref", params.triggerRef)
        .maybeSingle();
      if (existing?.id) return existing.id as string;
    }

    const { data, error } = await supabase
      .from("agent_runs")
      .insert({
        agent_slug: params.agentSlug,
        trigger: params.trigger,
        trigger_ref: params.triggerRef ?? null,
        goal_id: params.goalId ?? null,
        summary: params.summary ?? null,
        meta: params.meta ?? {},
      })
      .select("id")
      .single();
    if (error) return null;
    return data.id as string;
  } catch {
    return null;
  }
}

/** 記錄走到某個流程節點（nodeId 對應流程圖的節點 id） */
export async function logStep(
  runId: string | null,
  nodeId: string,
  patch: {
    status?: "running" | "done" | "skipped" | "failed" | "waiting";
    seq?: number;
    input?: string;
    output?: string;
    tokens?: number;
    costUsd?: number;
    durationMs?: number;
  } = {}
): Promise<void> {
  if (!runId) return;
  try {
    const supabase = getSupabase();
    const done = patch.status && patch.status !== "running" && patch.status !== "waiting";
    await supabase.from("agent_run_steps").insert({
      run_id: runId,
      node_id: nodeId,
      seq: patch.seq ?? 0,
      status: patch.status ?? "running",
      input_summary: patch.input ?? null,
      output_summary: patch.output ?? null,
      tokens: patch.tokens ?? 0,
      cost_usd: patch.costUsd ?? 0,
      duration_ms: patch.durationMs ?? null,
      ended_at: done ? new Date().toISOString() : null,
    });

    // 節點的花費累加回這次執行，才能回答「這份產出花了多少錢」
    if (patch.tokens || patch.costUsd) {
      const { data: run } = await supabase
        .from("agent_runs")
        .select("cost_usd,total_tokens")
        .eq("id", runId)
        .maybeSingle();
      await supabase
        .from("agent_runs")
        .update({
          cost_usd: Number(run?.cost_usd ?? 0) + (patch.costUsd ?? 0),
          total_tokens: Number(run?.total_tokens ?? 0) + (patch.tokens ?? 0),
        })
        .eq("id", runId);
    }
  } catch {
    /* 記錄失敗不影響主流程 */
  }
}

export async function finishRun(
  runId: string | null,
  params: { status: RunStatus; summary?: string; errorKind?: RunErrorKind; errorDetail?: string }
): Promise<void> {
  if (!runId) return;
  try {
    await getSupabase()
      .from("agent_runs")
      .update({
        status: params.status,
        summary: params.summary ?? null,
        error_kind: params.errorKind ?? null,
        error_detail: params.errorDetail ?? null,
        ended_at: new Date().toISOString(),
      })
      .eq("id", runId);
  } catch {
    /* ignore */
  }
}

/** 存下一份產出（報表、信、貼文…），可追溯回是哪一次執行做的 */
export async function saveArtifact(params: {
  agentSlug: AgentSlug;
  kind: ArtifactKind;
  title: string;
  runId?: string | null;
  content?: string;
  uri?: string;
  approvedBy?: string;
  meta?: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const { data, error } = await getSupabase()
      .from("agent_artifacts")
      .insert({
        run_id: params.runId ?? null,
        agent_slug: params.agentSlug,
        kind: params.kind,
        title: params.title,
        content: params.content ?? null,
        uri: params.uri ?? null,
        approved_by: params.approvedBy ?? null,
        approved_at: params.approvedBy ? new Date().toISOString() : null,
        meta: params.meta ?? {},
      })
      .select("id")
      .single();
    if (error) return null;
    return data.id as string;
  } catch {
    return null;
  }
}

/** 把事情交給另一位隊友（流程圖上的「協同」真的落地成一筆待辦） */
export async function delegate(params: {
  toAgent: AgentSlug;
  title: string;
  fromAgent?: AgentSlug;
  payload?: Record<string, unknown>;
  sourceRunId?: string | null;
  dueAt?: string;
}): Promise<string | null> {
  try {
    const { data, error } = await getSupabase()
      .from("agent_tasks")
      .insert({
        from_agent: params.fromAgent ?? null,
        to_agent: params.toAgent,
        title: params.title,
        payload: params.payload ?? {},
        source_run_id: params.sourceRunId ?? null,
        due_at: params.dueAt ?? null,
      })
      .select("id")
      .single();
    if (error) return null;
    return data.id as string;
  } catch {
    return null;
  }
}

/** 取出某位 Agent 待處理的委派 */
export async function claimTasks(agentSlug: AgentSlug, limit = 5) {
  try {
    const { data } = await getSupabase()
      .from("agent_tasks")
      .select("id,from_agent,title,payload,created_at,due_at")
      .eq("to_agent", agentSlug)
      .eq("state", "queued")
      .order("created_at", { ascending: true })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}

/** 找出這位 Agent 目前還在跑的那一次執行（給多輪對話的流程接續用） */
export async function findActiveRun(params: {
  agentSlug: AgentSlug;
  /** meta 裡的識別鍵，例如 LINE 使用者 id——同一個人的多輪對話屬於同一次執行 */
  metaKey?: string;
  metaValue?: string;
  withinMinutes?: number;
}): Promise<string | null> {
  try {
    const since = new Date(Date.now() - (params.withinMinutes ?? 60) * 60000).toISOString();
    let query = getSupabase()
      .from("agent_runs")
      .select("id")
      .eq("agent_slug", params.agentSlug)
      .in("status", ["running", "waiting"])
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(1);
    if (params.metaKey && params.metaValue) {
      query = query.eq(`meta->>${params.metaKey}`, params.metaValue);
    }
    const { data } = await query.maybeSingle();
    return (data?.id as string) ?? null;
  } catch {
    return null;
  }
}

export interface LiveStep {
  runId: string;
  nodeId: string;
  status: string;
  outputSummary: string | null;
  startedAt: string;
}

/**
 * 這位 Agent 現在走到哪個流程節點——直接讀 agent_run_steps。
 * 劇院模式的即時進度改吃這個之後，「流程圖」與「實際執行」就是同一份資料，
 * 不再是兩套各自維護的東西。
 */
export async function currentStep(agentSlug: AgentSlug, withinMinutes = 30): Promise<LiveStep | null> {
  try {
    const runId = await findActiveRun({ agentSlug, withinMinutes });
    if (!runId) return null;
    const { data } = await getSupabase()
      .from("agent_run_steps")
      .select("run_id,node_id,status,output_summary,started_at")
      .eq("run_id", runId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      runId: data.run_id as string,
      nodeId: data.node_id as string,
      status: data.status as string,
      outputSummary: (data.output_summary as string) ?? null,
      startedAt: data.started_at as string,
    };
  } catch {
    return null;
  }
}

export interface RunRow {
  id: string;
  agent_slug: string;
  trigger: string;
  status: RunStatus;
  started_at: string;
  ended_at: string | null;
  cost_usd: number;
  total_tokens: number;
  summary: string | null;
  error_kind: string | null;
}

/** 某位 Agent 最近幾次執行（後台／劇院模式讀取用） */
export async function listRuns(agentSlug: AgentSlug, limit = 10): Promise<RunRow[]> {
  try {
    const { data } = await getSupabase()
      .from("agent_runs")
      .select("id,agent_slug,trigger,status,started_at,ended_at,cost_usd,total_tokens,summary,error_kind")
      .eq("agent_slug", agentSlug)
      .order("started_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as RunRow[];
  } catch {
    return [];
  }
}
