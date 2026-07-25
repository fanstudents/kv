import { NextRequest, NextResponse } from "next/server";
import { getLiveTaskState, setLiveTask } from "@/lib/live-task-store";
import { currentStep } from "@/lib/agent-runs";
import type { AgentSlug } from "@/lib/types";

// /tv 每 1.5 秒輪詢：回傳某 Agent 的「真實現正處理」狀態（不含圖片本體）。
//
// 進度以 agent_run_steps 為準——那是真正的執行紀錄，node_id 就是流程圖節點的 id，
// 所以畫面上亮起來的節點與資料庫裡記下來的那一步是同一個東西。
// agent_live_task 仍然負責「現正處理的照片」與兩分鐘 TTL 的活著判斷（畫面用）。
export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get("agent") ?? "";
  const [t, step] = await Promise.all([getLiveTaskState(agent), currentStep(agent as AgentSlug)]);
  if (!t && !step) return NextResponse.json({ active: false });

  const status = step ? (step.status === "waiting" ? "waiting" : step.status === "done" ? "done" : "active") : t?.status;
  return NextResponse.json({
    active: true,
    // 有執行紀錄就以它為準，沒有才退回舊的暫存狀態
    nodeId: step?.nodeId ?? null,
    runId: step?.runId ?? null,
    step: t?.step ?? 0,
    status: status ?? "active",
    caption: step?.outputSummary ?? t?.caption ?? null,
    hasImage: t?.hasImage ?? false,
    imageVersion: t?.imageVersion ?? 0,
    updatedAt: t?.updatedAt ?? (step ? Date.parse(step.startedAt) : Date.now()),
  });
}

// 示範用觸發（登入牆保護）：展示時可手動帶動畫，或供測試不經 LINE 觸發
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const agent = typeof body.agent === "string" ? body.agent : "";
  if (!agent) return NextResponse.json({ error: "missing agent" }, { status: 400 });
  await setLiveTask(agent, {
    step: typeof body.step === "number" ? body.step : 0,
    status: body.status === "done" ? "done" : body.status === "waiting" ? "waiting" : "active",
    caption: typeof body.caption === "string" ? body.caption : undefined,
    image: typeof body.image === "string" ? body.image : undefined,
  });
  return NextResponse.json({ ok: true });
}
