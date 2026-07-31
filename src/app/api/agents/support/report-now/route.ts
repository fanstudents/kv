import { NextResponse } from "next/server";
import { runSupportDailyReport } from "@/adapters/reporting/daily-report-runners";

// 控制台上的「立即匯報」按鈕：馬上彙整過去 24 小時的客戶留言並送出一次
export async function POST() {
  const result = await runSupportDailyReport();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
