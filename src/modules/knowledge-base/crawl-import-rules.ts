import { isKnowledgeBaseHttpUrl } from "./crawl-preview-rules";

export type KnowledgeBaseCrawlImportMode = "single" | "site";

export interface KnowledgeBaseCrawlImportBody {
  url?: unknown;
  mode?: unknown;
  limit?: unknown;
}

export interface KnowledgeBaseCrawlImportInput {
  url: string;
  mode: KnowledgeBaseCrawlImportMode;
  limit: number;
}

export type KnowledgeBaseCrawlImportParseResult =
  | { kind: "valid"; input: KnowledgeBaseCrawlImportInput }
  | { kind: "invalid"; message: string };

export function parseKnowledgeBaseCrawlImportRequest(
  body: KnowledgeBaseCrawlImportBody
): KnowledgeBaseCrawlImportParseResult {
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const mode: KnowledgeBaseCrawlImportMode = body.mode === "site" ? "site" : "single";
  const limit = Math.min(60, Math.max(1, Number(body.limit) || 25));

  if (!url || !isKnowledgeBaseHttpUrl(url)) {
    return { kind: "invalid", message: "請提供有效的網址（http/https）" };
  }

  return { kind: "valid", input: { url, mode, limit } };
}
