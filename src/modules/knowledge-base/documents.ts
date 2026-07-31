import type { AgentSlug } from "@/lib/types";
import type {
  KnowledgeDoc,
  KnowledgeKind,
  KnowledgeLevel,
  KnowledgeStatus,
} from "@/lib/knowledge-base-data";

export interface KnowledgeDocumentQuery {
  status?: KnowledgeStatus;
  sourceDocId?: string;
}

export interface KnowledgeDocumentCreateInput {
  title: string;
  category: string;
  level: KnowledgeLevel;
  content?: string;
  kind: KnowledgeKind;
  status: KnowledgeStatus;
}

export interface KnowledgeDocumentUpdatePatch {
  title?: string;
  category?: string;
  level?: KnowledgeLevel;
  content?: string;
  kind?: KnowledgeKind;
  status?: KnowledgeStatus;
  owner?: string;
  reviewAt?: string | null;
}

export interface KnowledgeDocumentUpdateInput {
  id: string;
  patch: KnowledgeDocumentUpdatePatch;
}

export type KnowledgeDocumentDeleteOutcome = "deleted" | "not-found" | "builtin-protected";

export interface KnowledgeDocumentRepository {
  listDocs(filter: KnowledgeDocumentQuery): Promise<KnowledgeDoc[]>;
  listAccess(): Promise<Record<AgentSlug, KnowledgeLevel>>;
  add(input: KnowledgeDocumentCreateInput): Promise<KnowledgeDoc>;
  update(input: KnowledgeDocumentUpdateInput): Promise<KnowledgeDoc | null>;
  remove(id: string): Promise<KnowledgeDocumentDeleteOutcome>;
}

export interface KnowledgeDocumentReadResult {
  docs: KnowledgeDoc[];
  access: Record<AgentSlug, KnowledgeLevel>;
}

export type KnowledgeDocumentCreateParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; input: KnowledgeDocumentCreateInput };

export type KnowledgeDocumentUpdateParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; input: KnowledgeDocumentUpdateInput };

export type KnowledgeDocumentUpdateResult =
  | { kind: "ok"; data: KnowledgeDoc }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

export type KnowledgeDocumentDeleteParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; id: string };

export type KnowledgeDocumentDeleteResult = { kind: KnowledgeDocumentDeleteOutcome };

export const KNOWLEDGE_KINDS: readonly KnowledgeKind[] = ["faq", "sop", "fact", "table", "doc"];
export const KNOWLEDGE_STATUSES: readonly KnowledgeStatus[] = ["draft", "published", "archived"];

const VALID_LEVELS: readonly KnowledgeLevel[] = [1, 2, 3, 4];

export function parseKnowledgeDocumentQuery(input: {
  status: string | null;
  sourceDocId: string | null;
}): KnowledgeDocumentQuery {
  return {
    status: input.status && KNOWLEDGE_STATUSES.includes(input.status as KnowledgeStatus)
      ? (input.status as KnowledgeStatus)
      : undefined,
    sourceDocId: input.sourceDocId ?? undefined,
  };
}

export function parseKnowledgeDocumentCreate(body: unknown): KnowledgeDocumentCreateParseResult {
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

export function parseKnowledgeDocumentUpdate(body: unknown): KnowledgeDocumentUpdateParseResult {
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

export function parseKnowledgeDocumentDelete(id: string | null): KnowledgeDocumentDeleteParseResult {
  if (!id) return { kind: "invalid", message: "缺少 id" };
  return { kind: "ok", id };
}

export async function readKnowledgeDocuments(
  filter: KnowledgeDocumentQuery,
  repository: KnowledgeDocumentRepository,
): Promise<KnowledgeDocumentReadResult> {
  const [docs, access] = await Promise.all([repository.listDocs(filter), repository.listAccess()]);
  return { docs, access };
}

export async function createKnowledgeDocument(
  input: KnowledgeDocumentCreateInput,
  repository: KnowledgeDocumentRepository,
): Promise<KnowledgeDoc> {
  return repository.add(input);
}

export async function updateKnowledgeDocument(
  input: KnowledgeDocumentUpdateInput,
  repository: KnowledgeDocumentRepository,
): Promise<KnowledgeDocumentUpdateResult> {
  try {
    const data = await repository.update(input);
    if (!data) return { kind: "not-found" };
    return { kind: "ok", data };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : "更新失敗" };
  }
}

export async function deleteKnowledgeDocument(
  id: string,
  repository: KnowledgeDocumentRepository,
): Promise<KnowledgeDocumentDeleteResult> {
  return { kind: await repository.remove(id) };
}
