import { NextResponse } from "next/server";
import { runTeamLeadReport } from "@/lib/team-lead-report";

// 控制台上的「立即匯報」按鈕：馬上產生並送出一次晨報
export async function POST() {
  const result = await runTeamLeadReport();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
