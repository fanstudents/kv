import { NextRequest, NextResponse } from "next/server";
import { supabaseGoalsRepository } from "@/adapters/goals/supabase-goals-repository";
import { parseGoalsHistoryRequest } from "@/modules/goals/rules";
import { createGoalsService } from "@/modules/goals/service";

const goals = createGoalsService(supabaseGoalsRepository);

// 某個指標近 N 天的走勢（目標卡上的趨勢線用）
export async function GET(req: NextRequest) {
  const result = await goals.history(
    parseGoalsHistoryRequest(
      req.nextUrl.searchParams.get("metricId"),
      req.nextUrl.searchParams.get("days"),
    ),
  );
  if (result.kind === "invalid") return NextResponse.json({ error: result.message }, { status: 400 });
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 500 });
  return NextResponse.json({ points: result.points });
}
