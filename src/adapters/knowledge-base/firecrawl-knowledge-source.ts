import "server-only";
import {
  FirecrawlQuotaError,
  getCreditUsage,
  mapSite,
} from "@/adapters/knowledge-base/firecrawl-client";
import { importUrl, recheckUrlSources } from "@/lib/kb-crawl";
import { listKnowledgeDocs } from "@/lib/knowledge-base";
import type { KnowledgeCrawlProvider } from "@/modules/knowledge-base/crawl-source";

export function createFirecrawlKnowledgeSource(): KnowledgeCrawlProvider {
  return {
    getCreditUsage,
    mapSite,
    importUrl,
    listDrafts: (sourceId) => listKnowledgeDocs({ status: "draft", sourceDocId: sourceId }),
    recheckUrlSources,
    isQuotaError: (error) => error instanceof FirecrawlQuotaError,
  };
}
