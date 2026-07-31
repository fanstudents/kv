export type GoalDeleteParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; id: string };

export function parseGoalDeleteRequest(id: string | null): GoalDeleteParseResult {
  if (!id) return { kind: "invalid", message: "缺少 id" };
  return { kind: "ok", id };
}
