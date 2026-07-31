import type { KnowledgeKind, KnowledgeLevel, KnowledgeStatus } from "@/lib/knowledge-base-data";
import { KNOWLEDGE_KINDS, KNOWLEDGE_STATUSES } from "./create-rules";

export interface KnowledgeBaseUpdatePatch {
  title?: string;
  category?: string;
  level?: KnowledgeLevel;
  content?: string;
  kind?: KnowledgeKind;
  status?: KnowledgeStatus;
  owner?: string;
  reviewAt?: string | null;
}

export interface KnowledgeBaseUpdateInput {
  id: string;
  patch: KnowledgeBaseUpdatePatch;
}

export type KnowledgeBaseUpdateParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; input: KnowledgeBaseUpdateInput };

const VALID_LEVELS: readonly KnowledgeLevel[] = [1, 2, 3, 4];

export function parseKnowledgeBaseUpdateRequest(body: unknown): KnowledgeBaseUpdateParseResult {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const id = typeof input.id === "string" ? input.id : "";
  if (!id) return { kind: "invalid", message: "缺少 id" };

  const level = input.level === undefined ? undefined : (Number(input.level) as KnowledgeLevel);
  if (level !== undefined && !VALID_LEVELS.includes(level)) {
    return { kind: "invalid", message: "level 不合法" };
  }
  if (input.status !== undefined && !KNOWLEDGE_STATUSES.includes(input.status as KnowledgeStatus)) {
    return { kind: "invalid", message: "status 不合法" };
  }
  if (input.kind !== undefined && !KNOWLEDGE_KINDS.includes(input.kind as KnowledgeKind)) {
    return { kind: "invalid", message: "kind 不合法" };
  }

  return {
    kind: "ok",
    input: {
      id,
      patch: {
        title: typeof input.title === "string" ? input.title.trim() : undefined,
        category: typeof input.category === "string" ? input.category.trim() : undefined,
        level,
        content: typeof input.content === "string" ? input.content : undefined,
        kind: input.kind as KnowledgeKind | undefined,
        status: input.status as KnowledgeStatus | undefined,
        owner: typeof input.owner === "string" ? input.owner : undefined,
        reviewAt: input.reviewAt === null || typeof input.reviewAt === "string" ? input.reviewAt : undefined,
      },
    },
  };
}
