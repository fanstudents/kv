import "server-only";
import { runSupportDailyReport } from "@/lib/support-daily-report";
import { runTeamLeadReport } from "@/lib/team-lead-report";
import { recheckUrlSources } from "@/lib/kb-crawl";
import { GOAL_METRICS } from "@/lib/agent-goals";
import { snapshotMetric } from "@/lib/agent-memory";
import { tracked, claimRetry, type DueRetry } from "@/lib/agent-runs";
import type { AgentSlug } from "@/lib/types";

// 「重跑一次執行」的名冊。
//
// 光是把失敗記進 agent_runs 沒有用——要能重跑，系統得知道那次執行「本來要做什麼」。
// 執行紀錄裡只有 agent_slug 跟一段摘要，重建不出當時的呼叫。
// 所以會失敗、值得重跑的工作在 meta 留一個 replay 名字，這裡負責把名字換回函式。
//
// 沒有登記在這裡的執行不會被自動重跑（後台的重跑按鈕也會告訴你原因），
// 這是刻意的：不知道怎麼安全重放的東西，就不要自動重放。

export type ReplayHandler = (args: Record<string, unknown>) => Promise<unknown>;

export const REPLAY_HANDLERS: Record<string, ReplayHandler> = {
  "support-daily-report": () => runSupportDailyReport(),
  "team-lead-report": () => runTeamLeadReport(),
  "kb-recheck": () => recheckUrlSources(10),
  "metric-snapshot": async () => {
    let written = 0;
    for (const metric of GOAL_METRICS) {
      await snapshotMetric({ metricId: metric.id, value: metric.current, source: "demo" });
      written += 1;
    }
    return { metrics: written };
  },
};

export function replayName(meta: Record<string, unknown> | null | undefined): string | null {
  const name = meta?.replay;
  return typeof name === "string" && name in REPLAY_HANDLERS ? name : null;
}

export interface ReplayOutcome {
  runId: string;
  replay: string | null;
  status: "success" | "failed" | "skipped";
  detail?: string;
}

/**
 * 重跑一次失敗的執行。會開一次新的執行（parent_run_id 指回原本那次），
 * 而不是把舊的改成 running——「第幾次補救、每次結果如何」本身就是要留下來的資訊。
 */
export async function replayRun(run: DueRetry, opts: { force?: boolean } = {}): Promise<ReplayOutcome> {
  const name = replayName(run.meta);
  if (!name) {
    // 認領一下把 next_retry_at 清掉，否則這筆會每分鐘被撈出來一次
    await claimRetry(run.id, run.retry_count);
    return { runId: run.id, replay: null, status: "skipped", detail: "這次執行沒有登記可重放的工作" };
  }

  // 自動重試要先認領（避免兩個 worker 重跑同一次執行）；
  // 人在後台按的重跑則直接放行——那次執行多半已經重試耗盡、next_retry_at 是空的，
  // 走認領這條路只會得到一句「已被其他 worker 認領」，明明沒有其他 worker。
  if (!opts.force && !(await claimRetry(run.id, run.retry_count))) {
    return { runId: run.id, replay: name, status: "skipped", detail: "已被其他 worker 認領" };
  }

  const attempt = run.retry_count + 1;
  const args = (run.meta?.args as Record<string, unknown> | undefined) ?? {};

  try {
    await tracked(
      {
        agentSlug: run.agent_slug as AgentSlug,
        trigger: "schedule",
        // 重跑要有自己的冪等鍵，否則會被原本那次的 trigger_ref 擋下來
        triggerRef: run.trigger_ref ? `${run.trigger_ref}#retry${attempt}` : undefined,
        parentRunId: run.id,
        meta: { replay: name, args, retryOf: run.id, attempt },
        summary: `重跑「${name}」（第 ${attempt} 次）`,
      },
      () => REPLAY_HANDLERS[name](args)
    );
    return { runId: run.id, replay: name, status: "success" };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { runId: run.id, replay: name, status: "failed", detail };
  }
}
