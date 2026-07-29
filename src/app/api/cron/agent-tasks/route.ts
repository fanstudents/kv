import { NextRequest, NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron";
import { drainQueue } from "@/lib/agent-tasks";

// 委派佇列的 worker：把 agent_tasks 裡待處理的委派消化掉。
//
// 這支不用 runCronJob——它跑得很頻繁而且多數時候佇列是空的，
// 每次都開一列執行紀錄只會把 agent_runs 灌成雜訊。真正被處理的每一筆委派
// 自己會開一次執行（見 drainQueue），該追蹤的東西一筆都沒少。
//
// 建議每 2～5 分鐘呼叫一次。
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authError = cronAuthError(req);
  if (authError) return authError;

  const result = await drainQueue(5);
  return NextResponse.json({ ok: true, ...result });
}
