import { NextResponse } from "next/server";
import { getRunDetail } from "@/lib/agent-runs";
import { replayRun, replayName } from "@/lib/run-replay";

// 手動重跑一次失敗的執行。
//
// 走的是跟自動重試完全相同的那條路（run-replay.ts），差別只在誰按下去。
// 沒有登記可重放工作的執行不會硬跑——不知道怎麼安全重放的東西，
// 不該因為後台多了一顆按鈕就變得可以亂跑。
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { run } = await getRunDetail(id);
  if (!run) return NextResponse.json({ error: "找不到這次執行" }, { status: 404 });

  if (!replayName(run.meta)) {
    return NextResponse.json(
      { error: "這次執行沒有登記可重放的工作，無法自動重跑" },
      { status: 400 }
    );
  }

  const outcome = await replayRun(
    {
      id: run.id,
      agent_slug: run.agent_slug,
      trigger: run.trigger,
      trigger_ref: run.trigger_ref,
      retry_count: run.retry_count,
      meta: run.meta,
    },
    { force: true }
  );

  return NextResponse.json(outcome, { status: outcome.status === "failed" ? 500 : 200 });
}
