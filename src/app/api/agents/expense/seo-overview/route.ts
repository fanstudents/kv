import { NextRequest, NextResponse } from "next/server";
import { createLegacySearchOverviewAdapter } from "@/adapters/agents/legacy-search-overview-adapter";
import { runAgentOverview } from "@/modules/agents/overview-read-application";
import { parseAgentOverviewDays } from "@/modules/agents/overview-read-rules";

// SEO 助理（Leo）用：真實 Search Console 成效，?days= 選擇統計區間（預設 7 天）。
export async function GET(req: NextRequest) {
  const result = await runAgentOverview(
    createLegacySearchOverviewAdapter(),
    parseAgentOverviewDays(req.nextUrl.searchParams.get("days")),
  );
  if (result.kind === "error") return NextResponse.json({ ok: false, error: result.message }, { status: 502 });
  return NextResponse.json({ ok: true, data: result.data });
}
