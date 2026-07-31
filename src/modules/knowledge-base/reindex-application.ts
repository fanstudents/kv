import type { KnowledgeBaseIndexStats, KnowledgeBaseReindexPort } from "./reindex-ports";
import { selectIndexableKnowledgeDocs } from "./reindex-rules";

export interface KnowledgeBaseReindexResult {
  published: number;
  indexable: number;
  chunks: number;
  stats: KnowledgeBaseIndexStats;
}

export async function runKnowledgeBaseIndexStats(port: KnowledgeBaseReindexPort): Promise<KnowledgeBaseIndexStats> {
  return port.indexStats();
}

export async function runKnowledgeBaseReindex(port: KnowledgeBaseReindexPort): Promise<KnowledgeBaseReindexResult> {
  const docs = await port.listPublishedDocs();
  const indexableDocs = selectIndexableKnowledgeDocs(docs);
  const chunks = await port.indexDocs(indexableDocs.map((doc) => doc.id));
  return {
    published: docs.length,
    indexable: indexableDocs.length,
    chunks,
    stats: await port.indexStats(),
  };
}
