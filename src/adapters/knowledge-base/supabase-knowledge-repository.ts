import "server-only";
import {
  addKnowledgeDoc,
  listAgentAccess,
  listKnowledgeDocs,
  removeKnowledgeDoc,
  setAgentAccess,
  updateKnowledgeDoc,
} from "@/lib/knowledge-base";
import type { KnowledgeAccessPolicyRepository } from "@/modules/knowledge-base/access-policy";
import type { KnowledgeDocumentRepository } from "@/modules/knowledge-base/documents";

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
