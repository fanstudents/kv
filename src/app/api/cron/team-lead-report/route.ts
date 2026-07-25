import { NextRequest, NextResponse } from "next/server";
import { runTeamLeadReport } from "@/lib/team-lead-report";

// 每日排程觸發點（由外部排程器呼叫，如 GitHub Actions cron）。
// 設定 CRON_SECRET 環境變數後，需帶 x-cron-key header 才能觸發。
export async function GET(req: NextRequest) {
  // 一律要求密鑰（fail-closed）：以前是「有設定才驗證」，等於哪個環境漏設 CRON_SECRET，
  // 這支端點就對全世界開放——而它會觸發推播、爬蟲、燒 API 額度。
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "server misconfigured: CRON_SECRET not set" }, { status: 503 });
  }
  if (req.headers.get("x-cron-key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runTeamLeadReport();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
