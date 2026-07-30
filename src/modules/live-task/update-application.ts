import type { LiveTaskUpdatePort } from "./update-ports";
import type { LiveTaskUpdateRequest } from "./update-rules";

export type LiveTaskUpdateResult =
  | { kind: "invalid"; message: "missing agent" }
  | { kind: "ok" };

export async function runLiveTaskUpdate(
  input: LiveTaskUpdateRequest,
  port: LiveTaskUpdatePort,
): Promise<LiveTaskUpdateResult> {
  if (!input.agentSlug) return { kind: "invalid", message: "missing agent" };
  await port.setState(input.agentSlug, input.patch);
  return { kind: "ok" };
}
