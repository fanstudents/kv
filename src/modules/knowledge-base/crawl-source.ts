import type { KnowledgeDoc } from "@/lib/knowledge-base-data";
import { parseCronAuth, type CronAuthDecision } from "@/modules/cron/auth-rules";

export const KNOWLEDGE_SOURCE_RECHECK_LIMIT = 10;

export interface KnowledgeCrawlPreviewLink {
  url: string;
  title?: string;
}

export interface KnowledgeCrawlCreditUsage {
  remaining: number;
  plan: number;
  periodEnd: string | null;
}

export type KnowledgeCrawlPreviewQuery =
  | { kind: "credit" }
  | { kind: "site"; url: string }
  | { kind: "invalid"; message: string };

export type KnowledgeCrawlImportMode = "single" | "site";

export interface KnowledgeCrawlImportBody {
  url?: unknown;
  mode?: unknown;
  limit?: unknown;
}

export interface KnowledgeCrawlImportInput {
  url: string;
  mode: KnowledgeCrawlImportMode;
  limit: number;
}

export type KnowledgeCrawlImportParseResult =
  | { kind: "valid"; input: KnowledgeCrawlImportInput }
  | { kind: "invalid"; message: string };

export interface KnowledgeCrawlImportResult {
  sourceId: string;
  url: string;
  mode: KnowledgeCrawlImportMode;
  pageCount: number;
  chunkCount: number;
  processedChunks: number;
  candidateCount: number;
  truncated: boolean;
  unchanged?: boolean;
}

export interface KnowledgeCrawlRecheckChangedSource {
  sourceId: string;
  url: string;
  staleDocs: number;
}

export interface KnowledgeCrawlRecheckResult {
  checked: number;
  changed: KnowledgeCrawlRecheckChangedSource[];
}

export interface KnowledgeCrawlProvider {
  getCreditUsage(): Promise<KnowledgeCrawlCreditUsage | null>;
  mapSite(url: string, limit: number): Promise<KnowledgeCrawlPreviewLink[]>;
  importUrl(input: KnowledgeCrawlImportInput): Promise<KnowledgeCrawlImportResult>;
  listDrafts(sourceId: string): Promise<KnowledgeDoc[]>;
  recheckUrlSources(limit: number): Promise<KnowledgeCrawlRecheckResult>;
  isQuotaError(error: unknown): boolean;
}

export interface KnowledgeCrawlPreviewResult {
  credit?: KnowledgeCrawlCreditUsage | null;
  count?: number;
  links?: KnowledgeCrawlPreviewLink[];
}

export interface KnowledgeCrawlImportResponse extends KnowledgeCrawlImportResult {
  docs: KnowledgeDoc[];
  credit: KnowledgeCrawlCreditUsage | null;
}

export interface KnowledgeCrawlRecheckResponse extends KnowledgeCrawlRecheckResult {
  ok: true;
}

export type KnowledgeCrawlRecheckAuthDecision = CronAuthDecision;

export function isKnowledgeHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function parseKnowledgeCrawlPreview(rawUrl: string | null): KnowledgeCrawlPreviewQuery {
  if (!rawUrl) return { kind: "credit" };
  if (!isKnowledgeHttpUrl(rawUrl)) return { kind: "invalid", message: "請提供有效的網址" };
  return { kind: "site", url: rawUrl };
}

export function parseKnowledgeCrawlImport(body: KnowledgeCrawlImportBody): KnowledgeCrawlImportParseResult {
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const mode: KnowledgeCrawlImportMode = body.mode === "site" ? "site" : "single";
  const limit = Math.min(60, Math.max(1, Number(body.limit) || 25));

  if (!url || !isKnowledgeHttpUrl(url)) {
    return { kind: "invalid", message: "請提供有效的網址（http/https）" };
  }
  return { kind: "valid", input: { url, mode, limit } };
}

export function parseKnowledgeCrawlRecheckAuth(
  expectedSecret: string | undefined,
  providedSecret: string | null,
): KnowledgeCrawlRecheckAuthDecision {
  return parseCronAuth(expectedSecret, providedSecret);
}

export async function previewKnowledgeCrawl(
  query: Exclude<KnowledgeCrawlPreviewQuery, { kind: "invalid" }>,
  provider: KnowledgeCrawlProvider,
): Promise<KnowledgeCrawlPreviewResult> {
  if (query.kind === "credit") return { credit: await provider.getCreditUsage() };
  const [links, credit] = await Promise.all([provider.mapSite(query.url, 200), provider.getCreditUsage()]);
  return { count: links.length, links: links.slice(0, 30), credit };
}

export async function importKnowledgeFromUrl(
  input: KnowledgeCrawlImportInput,
  provider: KnowledgeCrawlProvider,
): Promise<KnowledgeCrawlImportResponse> {
  const result = await provider.importUrl(input);
  const [docs, credit] = await Promise.all([
    provider.listDrafts(result.sourceId),
    provider.getCreditUsage(),
  ]);
  return { ...result, docs, credit };
}

export async function recheckKnowledgeSources(
  provider: KnowledgeCrawlProvider,
): Promise<KnowledgeCrawlRecheckResponse> {
  const result = await provider.recheckUrlSources(KNOWLEDGE_SOURCE_RECHECK_LIMIT);
  return { ok: true, ...result };
}
