import type { KnowledgeDocumentDeleteOutcome } from "./documents";

export interface KnowledgeBaseImportDiscardPort {
  remove(id: string): Promise<KnowledgeDocumentDeleteOutcome>;
}
