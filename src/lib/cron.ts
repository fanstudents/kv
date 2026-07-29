import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { tracked } from "@/lib/agent-runs";
import { alertOps } from "@/lib/alerts";
import { getSupabase } from "@/lib/supabase";
import type { AgentSlug } from "@/lib/types";

// 排程端點的共同外殼。
//
// 每支 cron route 本來都各自抄一份密鑰檢查，而且沒有任何一支會開 agent_runs——
// 所以「今天的晨報跑了沒、花多少錢、為什麼沒發出去」全都查不到。
// 這層把三件事一次做掉：
//   1. fail-closed 的密鑰檢查（沿用原本的 x-cron-key）
//   2. 包成一次 agent_runs 執行，AI 成本自動歸屬（見 run-context.ts）
//   3. 失敗時推 LINE 告警，並依錯誤分類排重試

/** 台北時區的今天，當作每日排程的冪等鍵 */
export function taipeiToday(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
}

export interface CronJobSpec {
  agentSlug: AgentSlug;
  /** 排程名稱，會變成 trigger_ref 的前綴，例如 support-daily-report */
  job: string;
  /**
   * 每天只應該跑一次的排程設 true：同一天重複觸發會直接回報「今天已經跑過」，
   * 而不是再推一次晨報。帶 ?force=1 可以覆寫（手動測試用）。
   */
  daily?: boolean;
  /** 失敗後可以自動重跑：會在 meta 記下 replay 名稱，交給 /api/cron/retry 消化 */
  replay?: string;
  /** 這次執行的參數，重跑時原樣帶回去 */
  replayArgs?: Record<string, unknown>;
}

/** 密鑰檢查。通過回傳 null，否則回傳該直接送出的錯誤回應。 */
export function cronAuthError(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "server misconfigured: CRON_SECRET not set" }, { status: 503 });
  }
  if (req.headers.get("x-cron-key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/** 這個冪等鍵今天是不是已經成功跑過了 */
async function alreadySucceeded(agentSlug: string, triggerRef: string): Promise<boolean> {
  try {
    const { data } = await getSupabase()
      .from("agent_runs")
      .select("status")
      .eq("agent_slug", agentSlug)
      .eq("trigger_ref", triggerRef)
      .maybeSingle();
    return data?.status === "success";
  } catch (err) {
    // 查不到就放行：冪等檢查壞掉不該讓排程整個停擺
    console.error("[cron] 冪等檢查失敗，照常執行", { triggerRef, err });
    return false;
  }
}

/**
 * 跑一支排程並回傳 HTTP 回應。
 *
 * fn 拿到 runId 是為了 logStep / saveArtifact；AI 成本不需要它，會自己歸屬。
 */
export async function runCronJob<T>(
  req: NextRequest,
  spec: CronJobSpec,
  fn: (runId: string | null) => Promise<T>
): Promise<NextResponse> {
  const authError = cronAuthError(req);
  if (authError) return authError;

  const force = new URL(req.url).searchParams.get("force") === "1";
  const triggerRef = spec.daily ? `${spec.job}:${taipeiToday()}` : undefined;

  if (triggerRef && !force && (await alreadySucceeded(spec.agentSlug, triggerRef))) {
    return NextResponse.json({ ok: true, skipped: "今天已經成功跑過，未重複執行" });
  }

  try {
    const result = await tracked(
      {
        agentSlug: spec.agentSlug,
        trigger: "schedule",
        triggerRef,
        meta: spec.replay ? { replay: spec.replay, args: spec.replayArgs ?? {} } : { job: spec.job },
        summarize: (r) => summarize(spec.job, r),
      },
      fn
    );
    return NextResponse.json({ ok: true, ...(isObject(result) ? result : { result }) });
  } catch (err) {
    // tracked 已經把執行標成 failed 並排好重試了，這裡只負責「讓人知道」
    const detail = err instanceof Error ? err.message : String(err);
    await alertOps(`排程「${spec.job}」失敗`, detail);
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function summarize(job: string, result: unknown): string {
  if (isObject(result) && typeof result.message === "string") return result.message;
  return `排程 ${job} 完成`;
}
