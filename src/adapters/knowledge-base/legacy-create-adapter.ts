import "server-only";
import { addKnowledgeDoc } from "@/lib/knowledge-base";
import type { KnowledgeBaseCreatePort } from "@/modules/knowledge-base/create-ports";

export function createLegacyKnowledgeBaseCreateAdapter(): KnowledgeBaseCreatePort {
  return { add: addKnowledgeDoc };
}
