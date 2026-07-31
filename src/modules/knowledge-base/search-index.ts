export interface KnowledgeIndexDocument {
  id: string;
  content?: string | null;
}

export interface KnowledgeIndexStats {
  chunks: number;
  docs: number;
}

export interface KnowledgeIndexRepository {
  listPublishedDocs(): Promise<KnowledgeIndexDocument[]>;
  indexDocs(docIds: string[]): Promise<number>;
  indexStats(): Promise<KnowledgeIndexStats>;
}

export interface KnowledgeReindexResult {
  published: number;
  indexable: number;
  chunks: number;
  stats: KnowledgeIndexStats;
}

export function selectIndexableKnowledgeDocuments(
  docs: KnowledgeIndexDocument[],
): KnowledgeIndexDocument[] {
  return docs.filter((doc) => Boolean(doc.content && doc.content.trim().length > 0));
}

export async function readKnowledgeIndexStats(
  repository: KnowledgeIndexRepository,
): Promise<KnowledgeIndexStats> {
  return repository.indexStats();
}

export async function rebuildKnowledgeIndex(
  repository: KnowledgeIndexRepository,
): Promise<KnowledgeReindexResult> {
  const docs = await repository.listPublishedDocs();
  const indexableDocs = selectIndexableKnowledgeDocuments(docs);
  const chunks = await repository.indexDocs(indexableDocs.map((doc) => doc.id));
  return {
    published: docs.length,
    indexable: indexableDocs.length,
    chunks,
    stats: await repository.indexStats(),
  };
}
