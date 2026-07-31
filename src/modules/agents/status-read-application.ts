import type { AgentStatusReadPort } from "./status-read-ports";
import { buildAgentStatusMap, type AgentStatusCatalogEntry, type AgentStatusMap } from "./status-rules";

export async function runAgentStatusRead(
  port: AgentStatusReadPort,
  catalog: readonly AgentStatusCatalogEntry[],
): Promise<{ enabled: AgentStatusMap }> {
  try {
    const { data } = await port.list();
    return { enabled: buildAgentStatusMap(catalog, data) };
  } catch {
    return { enabled: buildAgentStatusMap(catalog, null) };
  }
}
