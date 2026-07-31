import "server-only";
import { DEFAULT_GOALS, type AgentGoal, type GoalCadence } from "@/lib/agent-goals";
import { metricHistory } from "@/lib/agent-memory";
import { getSupabase } from "@/lib/supabase";
import type { AgentSlug } from "@/lib/types";
import type { GoalsRepository } from "@/modules/goals/service";

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

export const supabaseGoalsRepository: GoalsRepository = {
  async list() {
    const supabase = getSupabase();
    const { data } = await supabase.from("agent_goals").select("*").order("created_at", { ascending: true });
    if (data && data.length > 0) return data.map(toGoal);

    await supabase.from("agent_goals").insert(DEFAULT_GOALS.map(toRow));
    return DEFAULT_GOALS;
  },

  async upsert(goal) {
    const { error } = await getSupabase().from("agent_goals").upsert(toRow(goal));
    if (error) throw new Error(error.message);
    return goal;
  },

  async remove(id) {
    const { error } = await getSupabase().from("agent_goals").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async reset() {
    const supabase = getSupabase();
    await supabase.from("agent_goals").delete().neq("id", "");
    const { error } = await supabase.from("agent_goals").insert(DEFAULT_GOALS.map(toRow));
    if (error) throw new Error(error.message);
    return DEFAULT_GOALS;
  },

  loadHistory(metricId, days) {
    return metricHistory(metricId, days);
  },
};
