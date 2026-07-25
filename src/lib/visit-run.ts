import "server-only";
import { setLiveTask, type LiveStatus } from "@/lib/live-task-store";
import { finishRun, findActiveRun, logStep, saveArtifact, startRun } from "@/lib/agent-runs";

// 名片流程的「回報一步」——一次做兩件事：
//   1. 更新劇院螢幕的即時狀態（agent_live_task，兩分鐘 TTL，含真實照片）
//   2. 寫進執行紀錄（agent_run_steps，永久保存、可追溯、可算成本）
//
// nodeId 用的就是 agent-briefings.ts 裡流程圖節點的 id（scan / write / confirm /
// match / tag / draft / sent）。這是「流程圖＝實際執行」成立的關鍵：畫面上亮起來的
// 那一顆，跟資料庫裡記下來的那一步，是同一個識別碼。

const VISIT = "visit" as const;

/** 名片一進來就開一次執行（同一個 LINE 訊息重送不會變成第二次——messageId 當冪等鍵） */
export async function startVisitRun(params: {
  userId: string;
  messageId: string;
  summary?: string;
}): Promise<string | null> {
  return startRun({
    agentSlug: VISIT,
    trigger: "webhook",
    triggerRef: `line-card:${params.messageId}`,
    summary: params.summary ?? "LINE 傳入名片",
    meta: { lineUserId: params.userId },
  });
}

/** 找這位使用者目前進行中的名片流程（多輪對話會回到同一次執行） */
export async function currentVisitRun(userId: string): Promise<string | null> {
  return findActiveRun({ agentSlug: VISIT, metaKey: "lineUserId", metaValue: userId, withinMinutes: 120 });
}

/** 回報一步：同時更新劇院螢幕與執行紀錄 */
export async function reportVisitStep(params: {
  userId?: string;
  runId?: string | null;
  /** 流程圖節點 id */
  nodeId: string;
  /** 舊的步驟編號（劇院螢幕仍在用，維持相容） */
  step: number;
  status: LiveStatus;
  caption?: string;
  image?: string;
  detail?: string;
  seq?: number;
}): Promise<void> {
  await setLiveTask(VISIT, {
    step: params.step,
    status: params.status,
    caption: params.caption,
    image: params.image,
  });

  const runId = params.runId ?? (params.userId ? await currentVisitRun(params.userId) : null);
  await logStep(runId, params.nodeId, {
    status: params.status === "done" ? "done" : params.status === "waiting" ? "waiting" : "running",
    output: params.detail ?? params.caption,
    seq: params.seq ?? params.step,
  });
}

/** 收尾：把這次執行結案（成功／取消／失敗都走這裡） */
export async function endVisitRun(params: {
  userId: string;
  status: "success" | "cancelled" | "failed";
  summary: string;
  errorDetail?: string;
}): Promise<void> {
  const runId = await currentVisitRun(params.userId);
  if (!runId) return;
  await finishRun(runId, {
    status: params.status === "cancelled" ? "cancelled" : params.status,
    summary: params.summary,
    errorKind: params.status === "failed" ? "unknown" : undefined,
    errorDetail: params.errorDetail,
  });
}

/** 存一份產出（邀約信），可追溯回是哪一次執行、寄給誰 */
export async function saveVisitArtifact(params: {
  userId: string;
  title: string;
  content: string;
  kind?: "mail" | "message" | "calendar";
  meta?: Record<string, unknown>;
}): Promise<void> {
  const runId = await currentVisitRun(params.userId);
  await saveArtifact({
    agentSlug: VISIT,
    kind: params.kind ?? "mail",
    title: params.title,
    content: params.content,
    runId,
    meta: params.meta,
  });
}
