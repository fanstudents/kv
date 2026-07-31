import { NextRequest, NextResponse } from "next/server";
import { deleteGoal, resetGoalsToDefault } from "@/lib/agent-goals-server";
import { GOAL_METRICS } from "@/lib/agent-goals";
import { AGENTS } from "@/lib/agent-data";
import { createLegacyGoalUpdateAdapter } from "@/adapters/goals/legacy-update-adapter";
import { createLegacyGoalsReadAdapter } from "@/adapters/goals/legacy-read-adapter";
import { runGoalUpdate } from "@/modules/goals/update-application";
import { runGoalsRead } from "@/modules/goals/read-application";
import { parseGoalUpdateRequest } from "@/modules/goals/update-rules";

export async function GET() {
  const result = await runGoalsRead(createLegacyGoalsReadAdapter());
  return NextResponse.json({ goals: result.data });
}

/** 新增或更新一筆目標（同一個 id 就是更新） */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await runGoalUpdate(
    parseGoalUpdateRequest(body, AGENTS, GOAL_METRICS),
    createLegacyGoalUpdateAdapter(),
  );
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  return NextResponse.json({ goal: result.goal });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  await deleteGoal(id);
  return NextResponse.json({ ok: true });
}

/** 還原示範目標 */
export async function POST() {
  const goals = await resetGoalsToDefault();
  return NextResponse.json({ goals });
}
