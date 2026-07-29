import { NextRequest } from "next/server";
import { runTeamLeadReport } from "@/lib/team-lead-report";
import { runCronJob } from "@/lib/cron";

// 每日晨報的排程觸發點。密鑰檢查、執行追蹤、失敗告警與重試都在 runCronJob 裡。
export async function GET(req: NextRequest) {
  return runCronJob(
    req,
    { agentSlug: "teamlead", job: "team-lead-report", daily: true, replay: "team-lead-report" },
    () => runTeamLeadReport()
  );
}
