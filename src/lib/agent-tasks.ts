import "server-only";
import { getSupabase } from "@/lib/supabase";
import { pushLineMessage } from "@/lib/line";
import { remember } from "@/lib/agent-memory";
import {
  claimTasks,
  completeTask,
  failTask,
  saveArtifact,
  tracked,
  type ClaimedTask,
} from "@/lib/agent-runs";
import type { AgentSlug } from "@/lib/types";

// 委派佇列的消化端。
//
// agent_tasks 這張表原本是「設計得很完整、但從來沒有人寫也沒有人讀」的狀態：
// delegate() 與 claimTasks() 零呼叫，所以流程圖上畫的「協同」在系統裡不存在。
// 這支讓它真的會動——委派進來、被認領、被處理、留下可追溯的產出。
//
// 任務型別放在 payload.kind：
//   notify  把一段話推給老闆（由委派方決定內容）
//   review  需要人看一眼的事，落地成一則 alert 產出，出現在執行紀錄頁
// 不認得的型別不會被默默丟掉，而是標成失敗留著——沉默地吃掉委派比不處理更糟。

export type TaskKind = "notify" | "review";

/** 把認領後卡住的委派放回佇列（worker 中途掛掉時） */
export async function requeueStaleTasks(minutes = 30): Promise<number> {
  try {
    const { data, error } = await getSupabase().rpc("requeue_stale_agent_tasks", { p_minutes: minutes });
    if (error) {
      console.error("[agent-tasks] requeueStaleTasks 失敗", error);
      return 0;
    }
    return Number(data ?? 0);
  } catch (err) {
    console.error("[agent-tasks] requeueStaleTasks 例外", err);
    return 0;
  }
}

/** 目前有待處理委派的 Agent（只挑有事做的，不用對十二位輪詢） */
async function agentsWithQueuedTasks(): Promise<AgentSlug[]> {
  try {
    const { data } = await getSupabase()
      .from("agent_tasks")
      .select("to_agent")
      .eq("state", "queued")
      .limit(200);
    return [...new Set((data ?? []).map((r) => r.to_agent as AgentSlug))];
  } catch (err) {
    console.error("[agent-tasks] 查詢待處理委派失敗", err);
    return [];
  }
}

async function handleTask(task: ClaimedTask, runId: string | null): Promise<string> {
  const kind = task.payload?.kind as TaskKind | undefined;
  const detail = typeof task.payload?.detail === "string" ? task.payload.detail : "";

  switch (kind) {
    case "notify": {
      const target = typeof task.payload?.target === "string" ? task.payload.target : "";
      if (!target) throw new Error("notify 委派沒有指定推播對象（payload.target）");
      await pushLineMessage(target, `${task.title}\n\n${detail}`.trim());
      return `已推播：${task.title}`;
    }

    case "review": {
      await saveArtifact({
        agentSlug: task.to_agent as AgentSlug,
        kind: "alert",
        title: task.title,
        content: detail,
        runId,
        meta: { taskId: task.id, fromAgent: task.from_agent },
      });
      await remember({
        content: `收到來自 ${task.from_agent ?? "系統"} 的待複檢事項：${task.title}`,
        agentSlug: task.to_agent as AgentSlug,
        kind: "episodic",
        sourceRunId: runId,
        ttlDays: 30,
      });
      return `已記錄待複檢事項：${task.title}`;
    }

    default:
      throw new Error(`不認得的委派型別：${String(kind)}`);
  }
}

export interface DrainResult {
  processed: number;
  failed: number;
  message: string;
}

/** 消化一輪佇列：每位有待辦的 Agent 認領幾筆、各自處理 */
export async function drainQueue(perAgent = 5): Promise<DrainResult> {
  const agents = await agentsWithQueuedTasks();
  let processed = 0;
  let failed = 0;

  for (const agentSlug of agents) {
    const tasks = await claimTasks(agentSlug, perAgent);

    for (const task of tasks) {
      try {
        await tracked(
          {
            agentSlug,
            trigger: "agent",
            triggerRef: `task:${task.id}:${task.attempts}`,
            meta: { taskId: task.id, fromAgent: task.from_agent },
            summarize: (summary: string) => summary,
          },
          async (runId) => {
            const summary = await handleTask(task, runId);
            await completeTask(task.id, runId);
            return summary;
          }
        );
        processed += 1;
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        await failTask(task.id, task.attempts, detail);
        failed += 1;
      }
    }
  }

  return {
    processed,
    failed,
    message: `處理 ${processed} 筆委派、失敗 ${failed} 筆`,
  };
}
