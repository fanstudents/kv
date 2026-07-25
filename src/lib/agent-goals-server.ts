import "server-only";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_GOALS, type AgentGoal, type GoalCadence } from "@/lib/agent-goals";
import type { AgentSlug } from "@/lib/types";

// 目標的資料層（agent_goals 表）。原本存在瀏覽器的 localStorage——換一台電腦、
// 換個瀏覽器，指揮官設的目標就不見了，學員也看不到；現在存進資料庫，全站共用同一份。
//
// 第一次讀取時如果表是空的，會自動灌入 DEFAULT_GOALS 當示範資料，
// 讓畫面一打開就有東西可看（跟以前的行為一致）。

/* eslint-disable @typescript-eslint/no-explicit-any */
function toGoal(row: any): AgentGoal {
  return {
    id: row.id,
    agentSlug: row.agent_slug as AgentSlug,
    metricId: row.metric_id,
    target: Number(row.target),
    startValue: Number(row.start_value),
    startDate: row.start_date,
    dueDate: row.due_date,
    cadence: row.cadence as GoalCadence,
    note: row.note ?? undefined,
  };
}

function toRow(goal: AgentGoal) {
  return {
    id: goal.id,
    agent_slug: goal.agentSlug,
    metric_id: goal.metricId,
    target: goal.target,
    start_value: goal.startValue,
    start_date: goal.startDate,
    due_date: goal.dueDate,
    cadence: goal.cadence,
    note: goal.note ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function listGoals(): Promise<AgentGoal[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("agent_goals").select("*").order("created_at", { ascending: true });
  if (data && data.length > 0) return data.map(toGoal);

  // 空的就先灌示範目標（只做一次；使用者全部刪光後再進來會再灌一次，這是刻意的行為，
  // 因為這個頁面在教學展示時「一打開就要有東西」比「保持空白」重要）
  await supabase.from("agent_goals").insert(DEFAULT_GOALS.map(toRow));
  return DEFAULT_GOALS;
}

export async function upsertGoal(goal: AgentGoal): Promise<AgentGoal> {
  const { error } = await getSupabase().from("agent_goals").upsert(toRow(goal));
  if (error) throw new Error(error.message);
  return goal;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await getSupabase().from("agent_goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** 還原成預設的示範目標（展示前重置用） */
export async function resetGoalsToDefault(): Promise<AgentGoal[]> {
  const supabase = getSupabase();
  await supabase.from("agent_goals").delete().neq("id", "");
  const { error } = await supabase.from("agent_goals").insert(DEFAULT_GOALS.map(toRow));
  if (error) throw new Error(error.message);
  return DEFAULT_GOALS;
}
