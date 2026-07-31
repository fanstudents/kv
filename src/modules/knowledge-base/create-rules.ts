import type { KnowledgeKind, KnowledgeLevel, KnowledgeStatus } from "@/lib/knowledge-base-data";

export interface KnowledgeBaseCreateInput {
  title: string;
  category: string;
  level: KnowledgeLevel;
  content?: string;
  kind: KnowledgeKind;
  status: KnowledgeStatus;
}

export type KnowledgeBaseCreateParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; input: KnowledgeBaseCreateInput };

export const KNOWLEDGE_KINDS: readonly KnowledgeKind[] = ["faq", "sop", "fact", "table", "doc"];
export const KNOWLEDGE_STATUSES: readonly KnowledgeStatus[] = ["draft", "published", "archived"];

const VALID_LEVELS: readonly KnowledgeLevel[] = [1, 2, 3, 4];

export function parseKnowledgeBaseCreateRequest(body: unknown): KnowledgeBaseCreateParseResult {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const level = Number(input.level) as KnowledgeLevel;

  if (!title || !VALID_LEVELS.includes(level)) {
    return { kind: "invalid", message: "缺少 title 或 level 不合法" };
  }

  return {
    kind: "ok",
    input: {
      title,
      category: category || "未分類",
      level,
      content: typeof input.content === "string" ? input.content.trim() : undefined,
      kind: KNOWLEDGE_KINDS.includes(input.kind as KnowledgeKind) ? (input.kind as KnowledgeKind) : "doc",
      status: KNOWLEDGE_STATUSES.includes(input.status as KnowledgeStatus)
        ? (input.status as KnowledgeStatus)
        : "published",
    },
  };
}
