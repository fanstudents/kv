import type { KnowledgeDoc } from "@/lib/knowledge-base-data";
import type { KnowledgeDocumentDeleteOutcome } from "./documents";

export const KNOWLEDGE_BASE_IMPORT_MAX_BYTES = 12 * 1024 * 1024;

export interface KnowledgeIngestionFileMetadata {
  name: string;
  size: number;
}

export interface KnowledgeIngestionUploadInput {
  buf: Buffer;
  filename: string;
  mimeType?: string;
}

export interface KnowledgeIngestionResult {
  sourceId: string;
  filename: string;
  pageCount: number;
  chunkCount: number;
  processedChunks: number;
  candidateCount: number;
  truncated: boolean;
}

export interface KnowledgeIngestionSource {
  id: string;
  filename: string;
  page_count: number | null;
  status: string;
  created_at: string;
}

export interface KnowledgeIngestionRepository {
  importFile(input: KnowledgeIngestionUploadInput): Promise<KnowledgeIngestionResult>;
  listSources(): Promise<KnowledgeIngestionSource[]>;
  listDraftDocs(sourceId: string): Promise<KnowledgeDoc[]>;
  publish(ids: string[]): Promise<number>;
  remove(id: string): Promise<KnowledgeDocumentDeleteOutcome>;
}

export type KnowledgeIngestionUploadValidation =
  | { kind: "invalid"; status: 400 | 413; message: string }
  | { kind: "ok" };

export type KnowledgeIngestionReadQuery =
  | { kind: "sources" }
  | { kind: "drafts"; sourceId: string };

export type KnowledgeIngestionReadResult =
  | { sources: KnowledgeIngestionSource[] }
  | { docs: KnowledgeDoc[] };

export type KnowledgeIngestionPublishParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; ids: string[] };

export interface KnowledgeIngestionDiscardRequest {
  ids: string[];
}

export function validateKnowledgeIngestionFile(
  file: KnowledgeIngestionFileMetadata,
): KnowledgeIngestionUploadValidation {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { kind: "invalid", status: 400, message: "目前只支援 PDF；Word／簡報請先另存成 PDF" };
  }
  if (file.size > KNOWLEDGE_BASE_IMPORT_MAX_BYTES) {
    return {
      kind: "invalid",
      status: 413,
      message: `檔案超過 ${KNOWLEDGE_BASE_IMPORT_MAX_BYTES / 1024 / 1024}MB，請先拆成多份`,
    };
  }
  return { kind: "ok" };
}

export function parseKnowledgeIngestionRead(sourceId: string | null): KnowledgeIngestionReadQuery {
  if (!sourceId) return { kind: "sources" };
  return { kind: "drafts", sourceId };
}

export function parseKnowledgeIngestionPublish(body: unknown): KnowledgeIngestionPublishParseResult {
  const idsValue = (body as { ids?: unknown }).ids;
  const ids = Array.isArray(idsValue) ? idsValue.filter((id): id is string => typeof id === "string") : [];
  if (ids.length === 0) return { kind: "invalid", message: "沒有指定要發布的條目" };
  return { kind: "ok", ids };
}

export function parseKnowledgeIngestionDiscard(body: unknown): KnowledgeIngestionDiscardRequest {
  const idsValue = (body as { ids?: unknown }).ids;
  return {
    ids: Array.isArray(idsValue) ? idsValue.filter((id): id is string => typeof id === "string") : [],
  };
}

export async function uploadKnowledgeSource(
  input: KnowledgeIngestionUploadInput,
  repository: KnowledgeIngestionRepository,
): Promise<KnowledgeIngestionResult> {
  return repository.importFile(input);
}

export async function readKnowledgeIngestion(
  query: KnowledgeIngestionReadQuery,
  repository: KnowledgeIngestionRepository,
): Promise<KnowledgeIngestionReadResult> {
  if (query.kind === "sources") return { sources: await repository.listSources() };
  return { docs: await repository.listDraftDocs(query.sourceId) };
}

export async function publishKnowledgeDrafts(
  ids: string[],
  repository: KnowledgeIngestionRepository,
): Promise<{ published: number }> {
  return { published: await repository.publish(ids) };
}

export async function discardKnowledgeDrafts(
  request: KnowledgeIngestionDiscardRequest,
  repository: KnowledgeIngestionRepository,
): Promise<{ removed: number }> {
  let removed = 0;
  for (const id of request.ids) {
    if ((await repository.remove(id)) === "deleted") removed += 1;
  }
  return { removed };
}
