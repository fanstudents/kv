import type { AgentInstanceReadPort, AgentInstanceRecord } from "./agent-instance-read-ports";

export type AgentInstanceReadResult =
  | { kind: "found"; data: AgentInstanceRecord }
  | { kind: "not-found"; message: string };

export async function runAgentInstanceRead(
  slug: string,
  port: AgentInstanceReadPort
): Promise<AgentInstanceReadResult> {
  const result = await port.getBySlug(slug);
  if (result.errorMessage || !result.data) {
    return { kind: "not-found", message: result.errorMessage ?? "not found" };
  }
  return { kind: "found", data: result.data };
}
