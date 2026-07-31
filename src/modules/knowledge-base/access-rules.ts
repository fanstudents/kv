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

const VALID_LEVELS: KnowledgeLevel[] = [1, 2, 3, 4];

export function parseKnowledgeAccessUpdateRequest(
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
