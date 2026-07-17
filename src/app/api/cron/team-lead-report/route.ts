import { NextRequest, NextResponse } from "next/server";
import { runTeamLeadReport } from "@/lib/team-lead-report";

// 每日排程觸發點（由外部排程器呼叫，如 GitHub Actions cron）。
// 設定 CRON_SECRET 環境變數後，需帶 x-cron-key header 才能觸發。
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("x-cron-key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runTeamLeadReport();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
