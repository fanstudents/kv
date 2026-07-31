import type { KnowledgeDoc } from "@/lib/knowledge-base-data";
import type { KnowledgeBaseCrawlCreditUsage } from "./crawl-preview-ports";
import type {
  KnowledgeBaseCrawlImportPort,
  KnowledgeBaseCrawlImportResult,
} from "./crawl-import-ports";
import type { KnowledgeBaseCrawlImportInput } from "./crawl-import-rules";

export interface KnowledgeBaseCrawlImportResponse extends KnowledgeBaseCrawlImportResult {
  docs: KnowledgeDoc[];
  credit: KnowledgeBaseCrawlCreditUsage | null;
}

export async function runKnowledgeBaseCrawlImport(
  input: KnowledgeBaseCrawlImportInput,
  port: KnowledgeBaseCrawlImportPort
): Promise<KnowledgeBaseCrawlImportResponse> {
  const result = await port.importUrl(input);
  const [docs, credit] = await Promise.all([port.listDrafts(result.sourceId), port.getCreditUsage()]);
  return { ...result, docs, credit };
}
