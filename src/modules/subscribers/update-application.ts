import type { SubscribersUpdatePort } from "./update-ports";
import type { SubscribersUpdateParseResult } from "./update-rules";

export type SubscribersUpdateResult =
  | { kind: "error"; message: string }
  | { kind: "ok"; data: unknown };

export async function runSubscribersUpdate(
  input: SubscribersUpdateParseResult,
  port: SubscribersUpdatePort,
): Promise<SubscribersUpdateResult> {
  if (input.kind === "invalid") return { kind: "error", message: input.message };
  const { data, error } = await port.update(input.id, input.update);
  if (error) return { kind: "error", message: error.message };
  return { kind: "ok", data };
}
