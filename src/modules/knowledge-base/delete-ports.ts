export type KnowledgeBaseDeleteOutcome = "deleted" | "not-found" | "builtin-protected";

export interface KnowledgeBaseDeletePort {
  remove(id: string): Promise<KnowledgeBaseDeleteOutcome>;
}
