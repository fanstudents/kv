import "server-only";
import { indexDocs, indexStats } from "@/lib/kb-search";
import { listKnowledgeDocs } from "@/lib/knowledge-base";
import type { KnowledgeBaseReindexPort } from "@/modules/knowledge-base/reindex-ports";

export function createLegacyKnowledgeBaseReindexAdapter(): KnowledgeBaseReindexPort {
  return {
    listPublishedDocs: () => listKnowledgeDocs({ status: "published" }),
    indexDocs,
    indexStats,
  };
}
