export interface ActivityReadRequest {
  agentSlug: string | null;
  status: string | null;
  limit: number;
}

export function parseActivityReadRequest(
  status: unknown,
  limit: unknown,
  agentSlug: unknown = null,
): ActivityReadRequest {
  return {
    agentSlug: typeof agentSlug === "string" ? agentSlug : null,
    status: typeof status === "string" ? status : null,
    limit: Number(limit ?? "200"),
  };
}

export function parseAgentActivityReadRequest(agentSlug: unknown): ActivityReadRequest {
  return parseActivityReadRequest(null, "20", agentSlug);
}
