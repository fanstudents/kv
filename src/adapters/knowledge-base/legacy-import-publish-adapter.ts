import "server-only";
import { publishKnowledgeDocs } from "@/lib/knowledge-base";
import type { KnowledgeBaseImportPublishPort } from "@/modules/knowledge-base/import-publish-ports";

export function createLegacyKnowledgeBaseImportPublishAdapter(): KnowledgeBaseImportPublishPort {
  return { publish: publishKnowledgeDocs };
}
