import type { KnowledgeBaseReindexDoc } from "./reindex-rules";

export interface KnowledgeBaseIndexStats {
  chunks: number;
  docs: number;
}

export interface KnowledgeBaseReindexPort {
  listPublishedDocs(): Promise<KnowledgeBaseReindexDoc[]>;
  indexDocs(docIds: string[]): Promise<number>;
  indexStats(): Promise<KnowledgeBaseIndexStats>;
}
