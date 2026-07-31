export type KnowledgeBaseCrawlPreviewQuery =
  | { kind: "credit" }
  | { kind: "site"; url: string }
  | { kind: "invalid"; message: string };

export function isKnowledgeBaseHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function parseKnowledgeBaseCrawlPreviewQuery(rawUrl: string | null): KnowledgeBaseCrawlPreviewQuery {
  if (!rawUrl) return { kind: "credit" };
  if (!isKnowledgeBaseHttpUrl(rawUrl)) return { kind: "invalid", message: "請提供有效的網址" };
  return { kind: "site", url: rawUrl };
}
