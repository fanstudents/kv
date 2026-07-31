export interface AgentStatusCatalogEntry {
  slug: string;
  status: string;
}

export interface AgentStatusRow {
  slug: string;
  enabled: unknown;
}

export type AgentStatusMap = Record<string, boolean>;

export function buildAgentStatusMap(
  catalog: readonly AgentStatusCatalogEntry[],
  rows: readonly AgentStatusRow[] | null,
): AgentStatusMap {
  const enabled: AgentStatusMap = {};
  for (const row of rows ?? []) {
    enabled[row.slug] = Boolean(row.enabled);
  }
  for (const agent of catalog) {
    if (!(agent.slug in enabled)) enabled[agent.slug] = agent.status === "active";
  }
  return enabled;
}
