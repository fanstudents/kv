import type { AgentSlug, AgentStatus } from "@/lib/types";

/**
 * Execution describes how work is triggered and resumed. It is deliberately
 * independent from an Agent's presentation or department.
 */
export type ExecutionProfile =
  | "request-response"
  | "short-event"
  | "long-lived-event"
  | "scheduled-batch"
  | "realtime-session"
  | "legacy-relay";

export interface WorkflowBinding {
  workflowId: string;
  workflowVersion: number;
  triggerIds: string[];
  executionProfile: ExecutionProfile;
}

export interface AgentRoleTemplate {
  id: string;
  version: number;
  name: string;
  responsibility: string;
  capabilityIds: string[];
}

export interface AgentInstance {
  id: string;
  roleTemplateId: string;
  roleTemplateVersion: number;
  deploymentId: string;
  enabled: boolean;
  bindings: WorkflowBinding[];
  /** Existing application and database identifier; retained during migration. */
  legacySlug?: string;
  /** Deployment settings owned by line_agents, not by presentation. */
  settings?: Record<string, unknown> | null;
}

export interface AgentPresentation {
  legacySlug: AgentSlug;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  color: string;
  fallbackStatus: AgentStatus;
  metrics: { label: string; value: string; delta?: string }[];
  lastRun: string;
  recipients: number;
  personEn: string;
  personZh: string;
  role: string;
}

export interface CanonicalAgent {
  instance: AgentInstance;
  roleTemplate: AgentRoleTemplate;
  presentation: AgentPresentation;
}

export interface LegacyAgentIdentityInput {
  slug: AgentSlug;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  color: string;
  status: AgentStatus;
  metrics: { label: string; value: string; delta?: string }[];
  lastRun: string;
  recipients: number;
  personEn: string;
  personZh: string;
  role: string;
}

export interface AgentStatusCatalogEntry {
  slug: string;
  status: string;
}

export interface LineAgentOverrideInput {
  slug: string;
  enabled: unknown;
  settings?: unknown;
}

export interface AgentDeploymentOverride {
  legacySlug: string;
  enabled: boolean;
  settings: Record<string, unknown> | null;
}

export class DuplicateCanonicalAgentError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function canonicalAgentId(slug: AgentSlug): string {
  return `agent:${slug}`;
}

export function mapLegacyAgentIdentity(input: LegacyAgentIdentityInput): CanonicalAgent {
  const roleTemplateId = `role:${input.slug}`;

  return {
    instance: {
      id: canonicalAgentId(input.slug),
      legacySlug: input.slug,
      roleTemplateId,
      roleTemplateVersion: 1,
      deploymentId: "legacy-static-registry",
      enabled: input.status === "active",
      bindings: [],
    },
    roleTemplate: {
      id: roleTemplateId,
      version: 1,
      name: input.role,
      responsibility: input.description,
      // A capability registry is a later runtime concern. Do not infer one
      // from a name or presentation label during compatibility migration.
      capabilityIds: [],
    },
    presentation: {
      legacySlug: input.slug,
      name: input.name,
      shortName: input.shortName,
      tagline: input.tagline,
      description: input.description,
      color: input.color,
      fallbackStatus: input.status,
      metrics: input.metrics.map((metric) => ({ ...metric })),
      lastRun: input.lastRun,
      recipients: input.recipients,
      personEn: input.personEn,
      personZh: input.personZh,
      role: input.role,
    },
  };
}

export interface CanonicalAgentRegistry {
  agents: readonly CanonicalAgent[];
  getByLegacySlug(slug: string): CanonicalAgent | undefined;
  statusCatalog(): readonly AgentStatusCatalogEntry[];
}

export function createCanonicalAgentRegistry(
  inputs: readonly LegacyAgentIdentityInput[]
): CanonicalAgentRegistry {
  const agents = inputs.map(mapLegacyAgentIdentity);
  const byLegacySlug = new Map<string, CanonicalAgent>();
  const byInstanceId = new Set<string>();

  for (const agent of agents) {
    const { legacySlug } = agent.presentation;
    if (byLegacySlug.has(legacySlug) || byInstanceId.has(agent.instance.id)) {
      throw new DuplicateCanonicalAgentError(`Duplicate canonical Agent identity for ${legacySlug}`);
    }
    byLegacySlug.set(legacySlug, agent);
    byInstanceId.add(agent.instance.id);
  }

  return {
    agents,
    getByLegacySlug(slug) {
      return byLegacySlug.get(slug);
    },
    statusCatalog() {
      return agents.map(({ presentation }) => ({
        slug: presentation.legacySlug,
        status: presentation.fallbackStatus,
      }));
    },
  };
}

export function mapLineAgentOverride(input: LineAgentOverrideInput): AgentDeploymentOverride {
  return {
    legacySlug: input.slug,
    enabled: Boolean(input.enabled),
    settings: isRecord(input.settings) ? input.settings : null,
  };
}

/**
 * Applies only mutable deployment state. Presentation and role identity stay
 * untouched so a database row cannot become the source of UI copy or policy.
 */
export function applyLineAgentOverride(
  agent: CanonicalAgent,
  override: AgentDeploymentOverride
): CanonicalAgent {
  if (agent.presentation.legacySlug !== override.legacySlug) return agent;

  return {
    ...agent,
    instance: {
      ...agent.instance,
      enabled: override.enabled,
      settings: override.settings,
    },
  };
}
