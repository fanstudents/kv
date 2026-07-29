import { NextRequest } from "next/server";
import { runSupportDailyReport } from "@/lib/support-daily-report";
import { runCronJob } from "@/lib/cron";

// 每日排程觸發點（由 .github/workflows/daily-support-report.yml 呼叫）。
//
// 密鑰檢查、agent_runs 追蹤、失敗告警與重試都在 runCronJob 裡；
// daily: true 代表同一天重複觸發不會再推一次彙報（手動測試帶 ?force=1）。
export async function GET(req: NextRequest) {
  return runCronJob(
    req,
    { agentSlug: "support", job: "support-daily-report", daily: true, replay: "support-daily-report" },
    () => runSupportDailyReport()
  );
}
