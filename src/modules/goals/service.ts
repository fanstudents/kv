import type { AgentGoal } from "@/lib/agent-goals";
import type { GoalDeleteRequest, GoalsHistoryRequest, GoalUpdateRequest } from "./rules";

export interface GoalHistoryPoint {
  metric_id: string;
  value: number;
  captured_at: string;
}

export interface GoalsRepository {
  list(): Promise<AgentGoal[]>;
  upsert(goal: AgentGoal): Promise<AgentGoal>;
  remove(id: string): Promise<void>;
  reset(): Promise<AgentGoal[]>;
  loadHistory(metricId: string, days: number): Promise<GoalHistoryPoint[]>;
}

function storageError(error: unknown) {
  return {
    kind: "error" as const,
    message: error instanceof Error ? error.message : "儲存失敗",
  };
}

export function createGoalsService(repository: GoalsRepository) {
  return {
    async read() {
      try {
        return { kind: "ok" as const, data: await repository.list() };
      } catch (error) {
        return storageError(error);
      }
    },

    async update(parsed: GoalUpdateRequest) {
      if (parsed.kind === "invalid") return parsed;
      try {
        const goal = await repository.upsert(parsed.goal);
        return { kind: "ok" as const, goal };
      } catch (error) {
        return storageError(error);
      }
    },

    async delete(parsed: GoalDeleteRequest) {
      if (parsed.kind === "invalid") return parsed;
      try {
        await repository.remove(parsed.id);
        return { kind: "ok" as const };
      } catch (error) {
        return storageError(error);
      }
    },

    async reset() {
      try {
        return { kind: "ok" as const, data: await repository.reset() };
      } catch (error) {
        return storageError(error);
      }
    },

    async history(input: GoalsHistoryRequest) {
      if (!input.metricId) return { kind: "invalid" as const, message: "缺少 metricId" };
      try {
        const points = await repository.loadHistory(input.metricId, input.days);
        return { kind: "ok" as const, points };
      } catch (error) {
        return storageError(error);
      }
    },
  };
}
