import { NextRequest } from "next/server";
import { GOAL_METRICS } from "@/lib/agent-goals";
import { snapshotMetric } from "@/lib/agent-memory";
import { runCronJob } from "@/lib/cron";

// 每日指標快照：把每個目標指標當天的值寫進 metric_snapshots。
//
// 為什麼需要：目標的達成率現在只有「現在幾分」，畫不出趨勢、算不出預估達標日，
// 也分不出「這是 Agent 做出來的，還是自然波動」。有了每天一筆，這三件事才成立。
//
// 目前的值來自 GOAL_METRICS.current（示範資料來源）；等 GSC／GA4／Meta 真的串上，
// 只要把那一層換掉，這支排程不用改。
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  return runCronJob(
    req,
    { agentSlug: "report", job: "metric-snapshot", daily: true, replay: "metric-snapshot" },
    async () => {
      let written = 0;
      for (const metric of GOAL_METRICS) {
        await snapshotMetric({ metricId: metric.id, value: metric.current, source: "demo" });
        written += 1;
      }
      return { metrics: written, message: `已寫入 ${written} 個指標的今日快照` };
    }
  );
}
