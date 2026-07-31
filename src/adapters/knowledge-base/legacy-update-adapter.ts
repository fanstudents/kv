import "server-only";
import { updateKnowledgeDoc } from "@/lib/knowledge-base";
import type { KnowledgeBaseUpdatePort } from "@/modules/knowledge-base/update-ports";

export function createLegacyKnowledgeBaseUpdateAdapter(): KnowledgeBaseUpdatePort {
  return {
    update: ({ id, patch }) => updateKnowledgeDoc(id, patch),
  };
}
