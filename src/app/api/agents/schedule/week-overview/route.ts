import { NextResponse } from "next/server";
import { createLegacyWeekOverviewAdapter } from "@/adapters/agents/legacy-week-overview-adapter";
import { runAgentOverview } from "@/modules/agents/overview-read-application";

// 行程助理(Milo)用：真實 Google 行事曆未來七天總覽。
export async function GET() {
  const result = await runAgentOverview(createLegacyWeekOverviewAdapter());
  if (result.kind === "error") return NextResponse.json({ ok: false, error: result.message }, { status: 502 });
  return NextResponse.json({ ok: true, data: result.data });
}
