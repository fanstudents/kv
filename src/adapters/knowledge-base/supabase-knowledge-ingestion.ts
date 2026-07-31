import "server-only";
import { importPdf, listKbSources } from "@/lib/kb-import";
import { listKnowledgeDocs, publishKnowledgeDocs, removeKnowledgeDoc } from "@/lib/knowledge-base";
import type { KnowledgeIngestionRepository } from "@/modules/knowledge-base/ingestion";

export function createSupabaseKnowledgeIngestion(): KnowledgeIngestionRepository {
  return {
    importFile: importPdf,
    listSources: listKbSources,
    listDraftDocs: (sourceId) => listKnowledgeDocs({ status: "draft", sourceDocId: sourceId }),
    publish: publishKnowledgeDocs,
    remove: removeKnowledgeDoc,
  };
}
