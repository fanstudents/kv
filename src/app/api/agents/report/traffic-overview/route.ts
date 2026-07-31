import { NextRequest, NextResponse } from "next/server";
import { createLegacyTrafficOverviewAdapter } from "@/adapters/agents/legacy-traffic-overview-adapter";
import { runAgentOverview } from "@/modules/agents/overview-read-application";
import { parseAgentOverviewDays } from "@/modules/agents/overview-read-rules";

// 數據助理（Ivy）用：真實 GA4 流量、轉換與渠道拆分，?days= 選擇統計區間（預設 7 天）。
export async function GET(req: NextRequest) {
  const result = await runAgentOverview(
    createLegacyTrafficOverviewAdapter(),
    parseAgentOverviewDays(req.nextUrl.searchParams.get("days")),
  );
  if (result.kind === "error") return NextResponse.json({ ok: false, error: result.message }, { status: 502 });
  return NextResponse.json({ ok: true, data: result.data });
}
