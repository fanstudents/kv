import type { KnowledgeDoc } from "@/lib/knowledge-base-data";
import type { KnowledgeBaseCrawlCreditUsage } from "./crawl-preview-ports";
import type { KnowledgeBaseCrawlImportInput } from "./crawl-import-rules";

export interface KnowledgeBaseCrawlImportResult {
  sourceId: string;
  url: string;
  mode: "single" | "site";
  pageCount: number;
  chunkCount: number;
  processedChunks: number;
  candidateCount: number;
  truncated: boolean;
  unchanged?: boolean;
}

export interface KnowledgeBaseCrawlImportPort {
  importUrl(input: KnowledgeBaseCrawlImportInput): Promise<KnowledgeBaseCrawlImportResult>;
  listDrafts(sourceId: string): Promise<KnowledgeDoc[]>;
  getCreditUsage(): Promise<KnowledgeBaseCrawlCreditUsage | null>;
  isQuotaError(error: unknown): boolean;
}
