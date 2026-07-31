import "server-only";
import { recheckUrlSources } from "@/lib/kb-crawl";
import type { KnowledgeBaseRecheckPort } from "@/modules/knowledge-base/recheck-ports";

export function createLegacyKnowledgeBaseRecheckAdapter(): KnowledgeBaseRecheckPort {
  return { recheckUrlSources };
}
