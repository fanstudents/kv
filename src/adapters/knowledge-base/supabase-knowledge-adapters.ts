import "server-only";

import { importPdf, listKbSources } from "@/lib/kb-import";
import { indexDocs, indexStats } from "@/lib/kb-search";
import {
  addKnowledgeDoc,
  listAgentAccess,
  listKnowledgeDocs,
  publishKnowledgeDocs,
  removeKnowledgeDoc,
  setAgentAccess,
  updateKnowledgeDoc,
} from "@/lib/knowledge-base";
import type { KnowledgeAccessPolicyRepository } from "@/modules/knowledge-base/access-policy";
import type { KnowledgeDocumentRepository } from "@/modules/knowledge-base/documents";
import type { KnowledgeIngestionRepository } from "@/modules/knowledge-base/ingestion";
import type { KnowledgeIndexRepository } from "@/modules/knowledge-base/search-index";

export function createSupabaseKnowledgeRepository(): KnowledgeDocumentRepository & KnowledgeAccessPolicyRepository {
  return {
    listDocs: listKnowledgeDocs,
    listAccess: listAgentAccess,
    add: addKnowledgeDoc,
    update: ({ id, patch }) => updateKnowledgeDoc(id, patch),
    remove: removeKnowledgeDoc,
    setAccess: setAgentAccess,
  };
}

export function createSupabaseKnowledgeIngestion(): KnowledgeIngestionRepository {
  return {
    importFile: importPdf,
    listSources: listKbSources,
    listDraftDocs: (sourceId) => listKnowledgeDocs({ status: "draft", sourceDocId: sourceId }),
    publish: publishKnowledgeDocs,
    remove: removeKnowledgeDoc,
  };
}

export function createSupabaseKnowledgeIndex(): KnowledgeIndexRepository {
  return {
    listPublishedDocs: () => listKnowledgeDocs({ status: "published" }),
    indexDocs,
    indexStats,
  };
}
