import { NextRequest, NextResponse } from "next/server";
import { createLegacyGoalsHistoryAdapter } from "@/adapters/goals/legacy-history-adapter";
import { runGoalsHistory } from "@/modules/goals/history-application";
import { parseGoalsHistoryRequest } from "@/modules/goals/history-rules";

// 某個指標近 N 天的走勢（目標卡上的趨勢線用）
export async function GET(req: NextRequest) {
  const result = await runGoalsHistory(
    parseGoalsHistoryRequest(
      req.nextUrl.searchParams.get("metricId"),
      req.nextUrl.searchParams.get("days"),
    ),
    createLegacyGoalsHistoryAdapter(),
  );
  if (result.kind === "invalid") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ points: result.points });
}
