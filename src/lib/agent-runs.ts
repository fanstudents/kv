import "server-only";
import { getSupabase } from "./supabase";
import { withRun } from "./run-context";
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
  /** 這次是為了補救哪一次失敗的執行（重跑時帶） */
  parentRunId?: string | null;
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
        parent_run_id: params.parentRunId ?? null,
        meta: params.meta ?? {},
      })
      .select("id")
      .single();
    if (error) {
      console.error("[agent-runs] startRun 寫入失敗", { agentSlug: params.agentSlug, error });
      return null;
    }
    return data.id as string;
  } catch (err) {
    console.error("[agent-runs] startRun 例外", { agentSlug: params.agentSlug, err });
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

    // 節點的花費累加回這次執行，才能回答「這份產出花了多少錢」。
    // 走資料庫端的原子累加：併發的 step 各自加各自的，不會互相蓋掉。
    if (patch.tokens || patch.costUsd) {
      await supabase.rpc("add_run_cost", {
        p_run_id: runId,
        p_tokens: patch.tokens ?? 0,
        p_cost: patch.costUsd ?? 0,
      });
    }
  } catch (err) {
    console.error("[agent-runs] logStep 失敗", { runId, nodeId, err });
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
  } catch (err) {
    console.error("[agent-runs] finishRun 失敗", { runId, err });
  }
}

/**
 * 把一段工作包成「一次執行」：開 run → 在 run context 裡跑 → 依結果收尾。
 *
 * 這是所有 cron / webhook / API route 應該用的唯一入口。包起來之後：
 * - fn 裡面任何一次 AI 呼叫都會自動把成本記到這次執行（靠 AsyncLocalStorage，不必傳 runId）
 * - 丟例外時執行會被標成 failed 並記下錯誤分類，而不是靜靜消失
 * - triggerRef 相同時直接沿用原本那次執行（冪等），webhook 重送不會變成第二次推播
 *
 * fn 收到 runId 是為了 logStep / saveArtifact 這類需要明確指定的呼叫。
 */
/**
 * 工作用回傳值表示失敗（而不是丟例外）時，tracked 會轉成這個例外。
 *
 * 沒有這一層的話，runTeamLeadReport 回 { ok: false, message: "尚未設定匯報對象" }
 * 會被記成一次漂亮的 success——晨報連續一週沒發出去，執行紀錄上完全看不出來。
 */
export class JobFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobFailure";
  }
}

function reportedFailure(result: unknown): string | null {
  if (typeof result !== "object" || result === null || Array.isArray(result)) return null;
  const row = result as Record<string, unknown>;
  if (row.ok !== false) return null;
  return typeof row.message === "string" ? row.message : "工作回報失敗";
}

export async function tracked<T>(
  params: {
    agentSlug: AgentSlug;
    trigger: RunTrigger;
    triggerRef?: string;
    goalId?: string;
    summary?: string;
    meta?: Record<string, unknown>;
    /** 這次是為了補救哪一次失敗的執行（重跑時帶） */
    parentRunId?: string | null;
    /** 成功時寫進 run 的摘要；拿 fn 的回傳值來組 */
    summarize?: (result: T) => string;
  },
  fn: (runId: string | null) => Promise<T>
): Promise<T> {
  const runId = await startRun(params);
  if (!runId) return fn(null);

  return withRun({ runId, agentSlug: params.agentSlug }, async () => {
    try {
      const result = await fn(runId);
      const failure = reportedFailure(result);
      if (failure) throw new JobFailure(failure);

      await finishRun(runId, {
        status: "success",
        summary: params.summarize?.(result) ?? params.summary,
      });
      return result;
    } catch (err) {
      await finishRun(runId, {
        status: "failed",
        errorKind: classifyError(err),
        errorDetail: err instanceof Error ? err.message.slice(0, 1000) : String(err).slice(0, 1000),
      });
      await scheduleRetry(runId);
      throw err;
    }
  });
}

/**
 * 把例外分類，好讓後台分得出「對方 API 掛了」跟「我們資料有問題」。
 * 分類會決定要不要重試：external / timeout 值得重試，data 重試幾次都一樣。
 */
export function classifyError(err: unknown): RunErrorKind {
  const msg = err instanceof Error ? err.message : String(err);
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) return "timeout";
  if (/timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|fetch failed/i.test(msg)) return "timeout";
  if (/\b(429|5\d\d)\b|rate limit|overloaded|unavailable/i.test(msg)) return "external";
  if (/budget|額度|上限/i.test(msg)) return "data";
  // 設定與資料問題要排在模型之前判斷：「Missing OPENAI_API_KEY」裡有 OpenAI 這個字，
  // 先比對模型的話會被歸成可重試，結果是對著一個必然失敗的設定問題重試三次。
  if (/missing|invalid|not found|找不到|缺少|未設定/i.test(msg)) return "data";
  if (/OpenAI|model|completion/i.test(msg)) return "model";
  return "unknown";
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
    if (error) {
      console.error("[agent-runs] saveArtifact 失敗", { title: params.title, error });
      return null;
    }
    return data.id as string;
  } catch (err) {
    console.error("[agent-runs] saveArtifact 例外", { title: params.title, err });
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
    if (error) {
      console.error("[agent-runs] delegate 失敗", { toAgent: params.toAgent, error });
      return null;
    }
    return data.id as string;
  } catch (err) {
    console.error("[agent-runs] delegate 例外", { toAgent: params.toAgent, err });
    return null;
  }
}

export interface ClaimedTask {
  id: string;
  from_agent: string | null;
  to_agent: string;
  title: string;
  payload: Record<string, unknown>;
  attempts: number;
  created_at: string;
  due_at: string | null;
}

/**
 * 認領這位 Agent 待處理的委派。
 *
 * 走資料庫端的 claim_agent_tasks()（FOR UPDATE SKIP LOCKED）而不是單純 select——
 * 純 select 的版本名不副實：兩個 worker 同時來會拿到同一批任務，全部做兩次。
 */
export async function claimTasks(agentSlug: AgentSlug, limit = 5): Promise<ClaimedTask[]> {
  try {
    const { data, error } = await getSupabase().rpc("claim_agent_tasks", {
      p_agent: agentSlug,
      p_limit: limit,
    });
    if (error) {
      console.error("[agent-runs] claimTasks 失敗", { agentSlug, error });
      return [];
    }
    return (data ?? []) as ClaimedTask[];
  } catch (err) {
    console.error("[agent-runs] claimTasks 例外", { agentSlug, err });
    return [];
  }
}

/** 委派處理完了：記下是哪一次執行處理的 */
export async function completeTask(taskId: string, handledRunId: string | null): Promise<void> {
  try {
    await getSupabase()
      .from("agent_tasks")
      .update({ state: "done", handled_run_id: handledRunId, updated_at: new Date().toISOString() })
      .eq("id", taskId);
  } catch (err) {
    console.error("[agent-runs] completeTask 失敗", { taskId, err });
  }
}

/** 委派處理失敗：試不到三次就放回佇列，滿三次標成 failed 等人看 */
export async function failTask(taskId: string, attempts: number, detail: string): Promise<void> {
  try {
    await getSupabase()
      .from("agent_tasks")
      .update({
        state: attempts >= 3 ? "failed" : "queued",
        last_error: detail.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);
  } catch (err) {
    console.error("[agent-runs] failTask 失敗", { taskId, err });
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

// ── 重試與死信 ──────────────────────────────────────────────
// 沒有這段的話，一次 OpenAI 429 就等於那則客戶留言永遠消失：run 會留下 failed，
// 但沒有任何東西會回頭處理它。退避間隔刻意拉開（1 / 5 / 25 分鐘）——
// 對方限流時密集重試只會讓情況更糟。

const MAX_RETRIES = 3;
const BACKOFF_MINUTES = [1, 5, 25];
/** 只有這幾種錯誤重試才有意義；資料錯誤重試一百次還是一樣的結果 */
const RETRYABLE: RunErrorKind[] = ["external", "timeout", "model"];

/** 依錯誤分類決定要不要排下一次重試（tracked 失敗時自動呼叫） */
export async function scheduleRetry(runId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: run } = await supabase
      .from("agent_runs")
      .select("retry_count,error_kind,meta")
      .eq("id", runId)
      .maybeSingle();
    if (!run) return;

    const kind = (run.error_kind ?? "unknown") as RunErrorKind;
    const attempts = Number(run.retry_count ?? 0);
    const replayable = Boolean((run.meta as Record<string, unknown> | null)?.replay);
    if (!replayable || !RETRYABLE.includes(kind) || attempts >= MAX_RETRIES) return;

    const delay = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length - 1)];
    await supabase
      .from("agent_runs")
      .update({ next_retry_at: new Date(Date.now() + delay * 60_000).toISOString() })
      .eq("id", runId);
  } catch (err) {
    console.error("[agent-runs] scheduleRetry 失敗", { runId, err });
  }
}

export interface DueRetry {
  id: string;
  agent_slug: string;
  trigger: string;
  trigger_ref: string | null;
  retry_count: number;
  meta: Record<string, unknown>;
}

/** 撈出到期該重跑的失敗執行 */
export async function listDueRetries(limit = 10): Promise<DueRetry[]> {
  try {
    const { data } = await getSupabase()
      .from("agent_runs")
      .select("id,agent_slug,trigger,trigger_ref,retry_count,meta")
      .eq("status", "failed")
      .not("next_retry_at", "is", null)
      .lte("next_retry_at", new Date().toISOString())
      .order("next_retry_at", { ascending: true })
      .limit(limit);
    return (data ?? []) as DueRetry[];
  } catch (err) {
    console.error("[agent-runs] listDueRetries 失敗", err);
    return [];
  }
}

/** 認領一筆重試：先把 next_retry_at 清掉，避免兩個 worker 同時重跑同一次執行 */
export async function claimRetry(runId: string, attempts: number): Promise<boolean> {
  try {
    const { data } = await getSupabase()
      .from("agent_runs")
      .update({ next_retry_at: null, retry_count: attempts + 1 })
      .eq("id", runId)
      .not("next_retry_at", "is", null)
      .select("id");
    return (data?.length ?? 0) > 0;
  } catch (err) {
    console.error("[agent-runs] claimRetry 失敗", { runId, err });
    return false;
  }
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
  } catch (err) {
    console.error("[agent-runs] listRuns 失敗", { agentSlug, err });
    return [];
  }
}

// ── 後台「執行紀錄」頁讀取用 ────────────────────────────────
// 這些表原本只有寫沒有讀：資料一直在累積，但後台沒有任何一頁看得到，
// 等於裝了黑盒子紀錄器卻沒有讀取黑盒子的螢幕。

export interface RunListRow extends RunRow {
  trigger_ref: string | null;
  error_detail: string | null;
  retry_count: number;
  next_retry_at: string | null;
  parent_run_id: string | null;
  meta: Record<string, unknown>;
}

/** 全隊最近的執行，可依 Agent 與狀態過濾 */
export async function listAllRuns(params: {
  agentSlug?: string;
  status?: RunStatus;
  limit?: number;
} = {}): Promise<RunListRow[]> {
  try {
    let query = getSupabase()
      .from("agent_runs")
      .select(
        "id,agent_slug,trigger,trigger_ref,status,started_at,ended_at,cost_usd,total_tokens,summary,error_kind,error_detail,retry_count,next_retry_at,parent_run_id,meta"
      )
      .order("started_at", { ascending: false })
      .limit(params.limit ?? 50);

    if (params.agentSlug) query = query.eq("agent_slug", params.agentSlug);
    if (params.status) query = query.eq("status", params.status);

    const { data, error } = await query;
    if (error) {
      // 最常見的原因是 20260730_runtime_hardening.sql 還沒套用（少了 retry_count 那幾欄）。
      // 不記下來的話，畫面上會是一個安靜的「還沒有執行紀錄」，跟真的沒紀錄長得一模一樣。
      console.error("[agent-runs] listAllRuns 查詢失敗", error);
      return [];
    }
    return (data ?? []) as RunListRow[];
  } catch (err) {
    console.error("[agent-runs] listAllRuns 失敗", err);
    return [];
  }
}

export interface StepRow {
  id: string;
  node_id: string;
  seq: number;
  status: string;
  input_summary: string | null;
  output_summary: string | null;
  duration_ms: number | null;
  started_at: string;
}

export interface ArtifactRow {
  id: string;
  kind: string;
  title: string;
  content: string | null;
  uri: string | null;
  created_at: string;
}

export interface UsageRow {
  operation: string;
  model: string;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
}

export interface RunDetail {
  run: RunListRow | null;
  steps: StepRow[];
  artifacts: ArtifactRow[];
  usage: UsageRow[];
}

/** 一次執行的全貌：走過哪些節點、產出什麼、每一筆 AI 呼叫花了多少 */
export async function getRunDetail(runId: string): Promise<RunDetail> {
  const empty: RunDetail = { run: null, steps: [], artifacts: [], usage: [] };
  try {
    const supabase = getSupabase();
    const [runRes, stepsRes, artifactsRes, usageRes] = await Promise.all([
      supabase
        .from("agent_runs")
        .select(
          "id,agent_slug,trigger,trigger_ref,status,started_at,ended_at,cost_usd,total_tokens,summary,error_kind,error_detail,retry_count,next_retry_at,parent_run_id,meta"
        )
        .eq("id", runId)
        .maybeSingle(),
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

    for (const [label, res] of [
      ["run", runRes],
      ["steps", stepsRes],
      ["artifacts", artifactsRes],
      ["usage", usageRes],
    ] as const) {
      if (res.error) console.error(`[agent-runs] getRunDetail 的 ${label} 查詢失敗`, res.error);
    }

    return {
      run: (runRes.data as RunListRow) ?? null,
      steps: (stepsRes.data ?? []) as StepRow[],
      artifacts: (artifactsRes.data ?? []) as ArtifactRow[],
      usage: (usageRes.data ?? []) as UsageRow[],
    };
  } catch (err) {
    console.error("[agent-runs] getRunDetail 失敗", { runId, err });
    return empty;
  }
}
