export type KnowledgeBaseDeleteParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; id: string };

export function parseKnowledgeBaseDeleteRequest(id: string | null): KnowledgeBaseDeleteParseResult {
  if (!id) return { kind: "invalid", message: "缺少 id" };
  return { kind: "ok", id };
}
