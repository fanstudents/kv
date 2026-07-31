import "server-only";
import { removeKnowledgeDoc } from "@/lib/knowledge-base";
import type { KnowledgeBaseDeletePort } from "@/modules/knowledge-base/delete-ports";

export function createLegacyKnowledgeBaseDeleteAdapter(): KnowledgeBaseDeletePort {
  return { remove: removeKnowledgeDoc };
}
