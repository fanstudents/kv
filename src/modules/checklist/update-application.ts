import type { ChecklistUpdatePort } from "./update-ports";
import type { ChecklistUpdateRequest } from "./update-rules";

export type ChecklistUpdateResult =
  | { kind: "error"; message: string }
  | { kind: "ok"; data: unknown };

export async function runChecklistUpdate(
  input: ChecklistUpdateRequest,
  port: ChecklistUpdatePort,
  now: Date = new Date(),
): Promise<ChecklistUpdateResult> {
  const { data, error } = await port.upsert({
    itemId: input.itemId,
    done: input.done,
    updatedAt: now.toISOString(),
  });
  if (error) return { kind: "error", message: error.message };
  return { kind: "ok", data };
}
