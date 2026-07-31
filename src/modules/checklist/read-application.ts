import type { ChecklistReadPort } from "./read-ports";

export type ChecklistReadResult =
  | { kind: "error"; message: string }
  | { kind: "ok"; data: unknown };

export async function runChecklistRead(port: ChecklistReadPort): Promise<ChecklistReadResult> {
  const { data, error } = await port.list();
  if (error) return { kind: "error", message: error.message };
  return { kind: "ok", data };
}
