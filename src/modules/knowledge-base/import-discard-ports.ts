import type { KnowledgeBaseDeleteOutcome } from "./delete-ports";

export interface KnowledgeBaseImportDiscardPort {
  remove(id: string): Promise<KnowledgeBaseDeleteOutcome>;
}
