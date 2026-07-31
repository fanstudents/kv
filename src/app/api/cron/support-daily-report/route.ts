import { NextRequest, NextResponse } from "next/server";
import { runSupportDailyReport } from "@/lib/support-daily-report";
import { parseCronAuth } from "@/modules/cron/auth-rules";

// 每日排程觸發點（由 .github/workflows/daily-support-report.yml 呼叫）。
export async function GET(req: NextRequest) {
  // fail-closed：沒設定 CRON_SECRET 就直接拒絕，不讓這支會推播、燒 API 額度的端點對全世界開放。
  const auth = parseCronAuth(process.env.CRON_SECRET, req.headers.get("x-cron-key"));
  if (auth.kind !== "authorized") return NextResponse.json({ error: auth.message }, { status: auth.status });

  const result = await runSupportDailyReport();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
