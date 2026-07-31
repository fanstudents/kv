import {
  CANONICAL_AGENT_REGISTRY,
  projectCanonicalAgentMeta,
} from "@/lib/agent-data";
import {
  applyLineAgentOverride,
  mapLineAgentOverride,
  type AgentDeploymentOverride,
  type AgentStatusCatalogEntry,
  type CanonicalAgent,
} from "@/modules/agents/identity";

/**
 * This is a compatibility adapter, not a new data source. It gives legacy
 * static data a stable canonical shape while all existing UI projections keep
 * their current imports until the frozen-UI cutover.
 */
export const LEGACY_AGENT_REGISTRY = CANONICAL_AGENT_REGISTRY;

export function getCanonicalAgentByLegacySlug(slug: string): CanonicalAgent | undefined {
  return LEGACY_AGENT_REGISTRY.getByLegacySlug(slug);
}

/**
 * Future frozen-UI cutovers consume this projection rather than the canonical
 * instance directly, so existing components can keep their exact AgentMeta
 * shape while ownership moves behind the mapper.
 */
export const toLegacyAgentMeta = projectCanonicalAgentMeta;

export function getLegacyAgentStatusCatalog(): readonly AgentStatusCatalogEntry[] {
  return LEGACY_AGENT_REGISTRY.statusCatalog();
}

export function mapLegacyLineAgentOverride(input: {
  slug: string;
  enabled: unknown;
  settings?: unknown;
}): AgentDeploymentOverride {
  return mapLineAgentOverride(input);
}

export function applyLegacyLineAgentOverride(
  agent: CanonicalAgent,
  input: { slug: string; enabled: unknown; settings?: unknown }
): CanonicalAgent {
  return applyLineAgentOverride(agent, mapLegacyLineAgentOverride(input));
}
