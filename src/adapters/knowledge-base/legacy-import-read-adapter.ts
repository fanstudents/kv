import "server-only";
import { listKbSources } from "@/lib/kb-import";
import { listKnowledgeDocs } from "@/lib/knowledge-base";
import type { KnowledgeBaseImportReadPort } from "@/modules/knowledge-base/import-read-ports";

export function createLegacyKnowledgeBaseImportReadAdapter(): KnowledgeBaseImportReadPort {
  return {
    listSources: listKbSources,
    listDraftDocs: (sourceId) => listKnowledgeDocs({ status: "draft", sourceDocId: sourceId }),
  };
}
