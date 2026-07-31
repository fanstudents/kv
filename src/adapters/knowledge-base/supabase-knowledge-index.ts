import "server-only";
import { indexDocs, indexStats } from "@/lib/kb-search";
import { listKnowledgeDocs } from "@/lib/knowledge-base";
import type { KnowledgeIndexRepository } from "@/modules/knowledge-base/search-index";

export function createSupabaseKnowledgeIndex(): KnowledgeIndexRepository {
  return {
    listPublishedDocs: () => listKnowledgeDocs({ status: "published" }),
    indexDocs,
    indexStats,
  };
}
