import type { ActivityReadPort } from "./read-ports";
import type { ActivityReadRequest } from "./read-rules";

export type ActivityReadResult =
  | { kind: "error"; message: string }
  | { kind: "ok"; data: unknown };

export async function runActivityRead(
  input: ActivityReadRequest,
  port: ActivityReadPort,
): Promise<ActivityReadResult> {
  const { data, error } = await port.list(input.status, input.limit);
  if (error) return { kind: "error", message: error.message };
  return { kind: "ok", data };
}
