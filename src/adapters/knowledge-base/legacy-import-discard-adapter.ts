import "server-only";
import { removeKnowledgeDoc } from "@/lib/knowledge-base";
import type { KnowledgeBaseImportDiscardPort } from "@/modules/knowledge-base/import-discard-ports";

export function createLegacyKnowledgeBaseImportDiscardAdapter(): KnowledgeBaseImportDiscardPort {
  return { remove: removeKnowledgeDoc };
}
