export interface KnowledgeBaseImportDiscardRequest {
  ids: string[];
}

export function parseKnowledgeBaseImportDiscardRequest(body: unknown): KnowledgeBaseImportDiscardRequest {
  const idsValue = (body as { ids?: unknown }).ids;
  return {
    ids: Array.isArray(idsValue) ? idsValue.filter((id): id is string => typeof id === "string") : [],
  };
}
