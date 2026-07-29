import { NextRequest } from "next/server";
import { recheckUrlSources } from "@/lib/kb-crawl";
import { runCronJob } from "@/lib/cron";

// 知識新鮮度排程：定期重爬網址來源，內容變了就把相關知識標成「待複檢」。
// 不會自動改寫既有條目——網站改版不該無聲無息地改變 Agent 講的話。
//
// 密鑰檢查、執行追蹤、失敗告警與重試都在 runCronJob 裡。
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return runCronJob(
    req,
    { agentSlug: "operations", job: "kb-recheck", daily: true, replay: "kb-recheck" },
    () => recheckUrlSources(10)
  );
}
