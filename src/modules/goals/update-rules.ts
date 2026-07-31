import type { AgentGoal, GoalCadence } from "@/lib/agent-goals";
import type { AgentSlug } from "@/lib/types";

export interface GoalUpdateCatalogEntry {
  slug: string;
}

export interface GoalUpdateMetricEntry {
  id: string;
}

export type GoalUpdateParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; goal: AgentGoal };

const CADENCES: GoalCadence[] = ["once", "weekly", "monthly", "quarterly"];

export function parseGoalUpdateRequest(
  body: unknown,
  catalog: readonly GoalUpdateCatalogEntry[],
  metrics: readonly GoalUpdateMetricEntry[],
  now: Date = new Date(),
): GoalUpdateParseResult {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const agentSlug = input.agentSlug;
  const metricId = typeof input.metricId === "string" ? input.metricId : "";

  if (!id) return { kind: "invalid", message: "缺少 id" };
  if (typeof agentSlug !== "string" || !catalog.some((agent) => agent.slug === agentSlug)) {
    return { kind: "invalid", message: "agentSlug 不合法" };
  }
  if (!metrics.some((metric) => metric.id === metricId)) {
    return { kind: "invalid", message: "找不到這個指標" };
  }
  if (!CADENCES.includes(input.cadence as GoalCadence)) {
    return { kind: "invalid", message: "cadence 不合法" };
  }

  const goal: AgentGoal = {
    id,
    agentSlug: agentSlug as AgentSlug,
    metricId,
    target: Number(input.target) || 0,
    startValue: Number(input.startValue) || 0,
    startDate: String(input.startDate ?? now.toISOString().slice(0, 10)),
    dueDate: String(input.dueDate ?? ""),
    cadence: input.cadence as GoalCadence,
    note: typeof input.note === "string" && input.note.trim() ? input.note.trim() : undefined,
  };
  if (!goal.dueDate) return { kind: "invalid", message: "缺少期限" };
  return { kind: "ok", goal };
}
