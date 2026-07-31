import { NextRequest, NextResponse } from "next/server";
import { GOAL_METRICS } from "@/lib/agent-goals";
import { AGENTS } from "@/lib/agent-data";
import { supabaseGoalsRepository } from "@/adapters/goals/supabase-goals-repository";
import { parseGoalDeleteRequest, parseGoalUpdateRequest } from "@/modules/goals/rules";
import { createGoalsService } from "@/modules/goals/service";

const goals = createGoalsService(supabaseGoalsRepository);

export async function GET() {
  const result = await goals.read();
  return NextResponse.json({ goals: result.data });
}

/** 新增或更新一筆目標（同一個 id 就是更新） */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await goals.update(parseGoalUpdateRequest(body, AGENTS, GOAL_METRICS));
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  return NextResponse.json({ goal: result.goal });
}

export async function DELETE(req: NextRequest) {
  const result = await goals.delete(parseGoalDeleteRequest(req.nextUrl.searchParams.get("id")));
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

/** 還原示範目標 */
export async function POST() {
  const result = await goals.reset();
  return NextResponse.json({ goals: result.data });
}
