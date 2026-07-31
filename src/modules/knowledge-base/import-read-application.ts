import type { KnowledgeBaseImportReadPort } from "./import-read-ports";
import type { KnowledgeBaseImportReadQuery } from "./import-read-rules";

export type KnowledgeBaseImportReadResult =
  | { sources: Awaited<ReturnType<KnowledgeBaseImportReadPort["listSources"]>> }
  | { docs: Awaited<ReturnType<KnowledgeBaseImportReadPort["listDraftDocs"]>> };

export async function runKnowledgeBaseImportRead(
  query: KnowledgeBaseImportReadQuery,
  port: KnowledgeBaseImportReadPort
): Promise<KnowledgeBaseImportReadResult> {
  if (query.kind === "sources") return { sources: await port.listSources() };
  return { docs: await port.listDraftDocs(query.sourceId) };
}
