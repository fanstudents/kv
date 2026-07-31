import "server-only";
import { setAgentAccess } from "@/lib/knowledge-base";
import type { KnowledgeAccessUpdatePort } from "@/modules/knowledge-base/access-ports";

export function createLegacyKnowledgeAccessUpdateAdapter(): KnowledgeAccessUpdatePort {
  return {
    setAccess: setAgentAccess,
  };
}
