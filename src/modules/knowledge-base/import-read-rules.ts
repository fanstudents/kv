export type KnowledgeBaseImportReadQuery =
  | { kind: "sources" }
  | { kind: "drafts"; sourceId: string };

export function parseKnowledgeBaseImportReadQuery(sourceId: string | null): KnowledgeBaseImportReadQuery {
  if (!sourceId) return { kind: "sources" };
  return { kind: "drafts", sourceId };
}
