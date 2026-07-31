import { NextResponse } from "next/server";
import { createLegacyPipelineOverviewAdapter } from "@/adapters/agents/legacy-pipeline-overview-adapter";
import { runAgentOverview } from "@/modules/agents/overview-read-application";

// 營運助理（Morgan）用：企業內訓／公開課程／企業顧問洽詢／報價單的真實現況（來自「教學系統」專案）。
export async function GET() {
  const result = await runAgentOverview(createLegacyPipelineOverviewAdapter());
  if (result.kind === "error") return NextResponse.json({ ok: false, error: result.message }, { status: 502 });
  return NextResponse.json({ ok: true, data: result.data });
}
