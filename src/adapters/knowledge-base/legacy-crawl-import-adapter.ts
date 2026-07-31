import "server-only";
import { FirecrawlQuotaError, getCreditUsage, importUrl } from "@/lib/kb-crawl";
import { listKnowledgeDocs } from "@/lib/knowledge-base";
import type { KnowledgeBaseCrawlImportPort } from "@/modules/knowledge-base/crawl-import-ports";

export function createLegacyKnowledgeBaseCrawlImportAdapter(): KnowledgeBaseCrawlImportPort {
  return {
    importUrl,
    listDrafts: (sourceId) => listKnowledgeDocs({ status: "draft", sourceDocId: sourceId }),
    getCreditUsage,
    isQuotaError: (error) => error instanceof FirecrawlQuotaError,
  };
}
