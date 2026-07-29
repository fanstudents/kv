import { NextRequest, NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron";
import { listDueRetries } from "@/lib/agent-runs";
import { replayRun } from "@/lib/run-replay";
import { alertOps } from "@/lib/alerts";

// 死信重跑：把到期該重試的失敗執行撿回來再跑一次。
//
// 這支是「一次 OpenAI 429 等於那則客戶留言永遠消失」的解法。
// 退避間隔由 scheduleRetry 決定（1 / 5 / 25 分鐘），滿三次就不再自動重試、
// 留在後台的執行紀錄裡等人看——自動重試不該無限進行，那只是把問題藏得更深。
//
// 建議每 5 分鐘呼叫一次。
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authError = cronAuthError(req);
  if (authError) return authError;

  const due = await listDueRetries(5);
  if (!due.length) return NextResponse.json({ ok: true, retried: 0 });

  const outcomes = [];
  for (const run of due) {
    outcomes.push(await replayRun(run));
  }

  const failed = outcomes.filter((o) => o.status === "failed");
  if (failed.length) {
    await alertOps(
      "自動重跑仍然失敗",
      failed.map((o) => `${o.replay ?? o.runId}：${o.detail ?? "未知原因"}`).join("\n")
    );
  }

  return NextResponse.json({
    ok: true,
    retried: outcomes.length,
    succeeded: outcomes.filter((o) => o.status === "success").length,
    failed: failed.length,
    skipped: outcomes.filter((o) => o.status === "skipped").length,
  });
}
