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

/**
 * Transitional composition boundary for the KB domain.
 *
 * These ports are stateless, so exporting stable objects avoids a per-request
 * forwarding factory. The implementations still delegate to the legacy
 * `src/lib` stores; a future KB journey may move that ownership, but must not
 * add another wrapper around this boundary.
 */
export const supabaseKnowledgeRepository: KnowledgeDocumentRepository & KnowledgeAccessPolicyRepository = {
  listDocs: listKnowledgeDocs,
  listAccess: listAgentAccess,
  add: addKnowledgeDoc,
  update: ({ id, patch }) => updateKnowledgeDoc(id, patch),
  remove: removeKnowledgeDoc,
  setAccess: setAgentAccess,
};

export const supabaseKnowledgeIngestionRepository: KnowledgeIngestionRepository = {
  importFile: importPdf,
  listSources: listKbSources,
  listDraftDocs: (sourceId) => listKnowledgeDocs({ status: "draft", sourceDocId: sourceId }),
  publish: publishKnowledgeDocs,
  remove: removeKnowledgeDoc,
};

export const supabaseKnowledgeIndexRepository: KnowledgeIndexRepository = {
  listPublishedDocs: () => listKnowledgeDocs({ status: "published" }),
  indexDocs,
  indexStats,
};
