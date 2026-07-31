import "server-only";
import { FirecrawlQuotaError, getCreditUsage, mapSite } from "@/lib/kb-crawl";
import type { KnowledgeBaseCrawlPreviewPort } from "@/modules/knowledge-base/crawl-preview-ports";

export function createLegacyKnowledgeBaseCrawlPreviewAdapter(): KnowledgeBaseCrawlPreviewPort {
  return {
    getCreditUsage,
    mapSite,
    isQuotaError: (error) => error instanceof FirecrawlQuotaError,
  };
}
