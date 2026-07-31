export type KnowledgeBaseImportPublishParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; ids: string[] };

export function parseKnowledgeBaseImportPublishRequest(body: unknown): KnowledgeBaseImportPublishParseResult {
  const idsValue = (body as { ids?: unknown }).ids;
  const ids: string[] = Array.isArray(idsValue) ? idsValue.filter((id): id is string => typeof id === "string") : [];
  if (ids.length === 0) return { kind: "invalid", message: "沒有指定要發布的條目" };
  return { kind: "ok", ids };
}
