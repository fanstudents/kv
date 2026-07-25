import { NextRequest, NextResponse } from "next/server";
import { deleteGoal, listGoals, resetGoalsToDefault, upsertGoal } from "@/lib/agent-goals-server";
import { metricOf, type AgentGoal, type GoalCadence } from "@/lib/agent-goals";
import { AGENTS } from "@/lib/agent-data";
import type { AgentSlug } from "@/lib/types";

const CADENCES = ["once", "weekly", "monthly", "quarterly"];

export async function GET() {
  return NextResponse.json({ goals: await listGoals() });
}

/** 新增或更新一筆目標（同一個 id 就是更新） */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const agentSlug = body.agentSlug as AgentSlug;
  const metricId = typeof body.metricId === "string" ? body.metricId : "";

  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  if (!AGENTS.some((a) => a.slug === agentSlug)) {
    return NextResponse.json({ error: "agentSlug 不合法" }, { status: 400 });
  }
  if (!metricOf(metricId)) return NextResponse.json({ error: "找不到這個指標" }, { status: 400 });
  if (!CADENCES.includes(body.cadence)) return NextResponse.json({ error: "cadence 不合法" }, { status: 400 });

  const goal: AgentGoal = {
    id,
    agentSlug,
    metricId,
    target: Number(body.target) || 0,
    startValue: Number(body.startValue) || 0,
    startDate: String(body.startDate ?? new Date().toISOString().slice(0, 10)),
    dueDate: String(body.dueDate ?? ""),
    cadence: body.cadence as GoalCadence,
    note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : undefined,
  };
  if (!goal.dueDate) return NextResponse.json({ error: "缺少期限" }, { status: 400 });

  try {
    await upsertGoal(goal);
    return NextResponse.json({ goal });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "儲存失敗" }, { status: 500 });
  }
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
