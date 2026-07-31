export interface KnowledgeBaseReindexDoc {
  id: string;
  content?: string | null;
}

export function selectIndexableKnowledgeDocs(docs: KnowledgeBaseReindexDoc[]): KnowledgeBaseReindexDoc[] {
  return docs.filter((doc) => Boolean(doc.content && doc.content.trim().length > 0));
}
