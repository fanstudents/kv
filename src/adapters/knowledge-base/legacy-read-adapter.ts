import "server-only";
import { listAgentAccess, listKnowledgeDocs } from "@/lib/knowledge-base";
import type { KnowledgeBaseReadPort } from "@/modules/knowledge-base/read-ports";

export function createLegacyKnowledgeBaseReadAdapter(): KnowledgeBaseReadPort {
  return {
    listDocs: listKnowledgeDocs,
    listAccess: listAgentAccess,
  };
}
