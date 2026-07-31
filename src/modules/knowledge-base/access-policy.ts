import type { AgentSlug } from "@/lib/types";
import type { KnowledgeLevel } from "@/lib/knowledge-base-data";

export interface KnowledgeAccessCatalogEntry {
  slug: string;
}

export type KnowledgeAccessUpdateRequest = {
  agentSlug: AgentSlug;
  level: KnowledgeLevel;
};

export type KnowledgeAccessUpdateParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; input: KnowledgeAccessUpdateRequest };

export type KnowledgeAccessUpdateResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok" };

export interface KnowledgeAccessPolicyRepository {
  setAccess(slug: AgentSlug, level: KnowledgeLevel): Promise<void>;
}

const VALID_LEVELS: KnowledgeLevel[] = [1, 2, 3, 4];

export function parseKnowledgeAccessUpdate(
  body: unknown,
  catalog: readonly KnowledgeAccessCatalogEntry[],
): KnowledgeAccessUpdateParseResult {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const agentSlug = input.agentSlug;
  const level = Number(input.level);

  if (
    typeof agentSlug !== "string" ||
    !catalog.some((agent) => agent.slug === agentSlug) ||
    !VALID_LEVELS.includes(level as KnowledgeLevel)
  ) {
    return { kind: "invalid", message: "agentSlug 或 level 不合法" };
  }

  return {
    kind: "ok",
    input: { agentSlug: agentSlug as AgentSlug, level: level as KnowledgeLevel },
  };
}

export async function updateKnowledgeAccess(
  parsed: KnowledgeAccessUpdateParseResult,
  repository: KnowledgeAccessPolicyRepository,
): Promise<KnowledgeAccessUpdateResult> {
  if (parsed.kind === "invalid") return parsed;
  await repository.setAccess(parsed.input.agentSlug, parsed.input.level);
  return { kind: "ok" };
}
