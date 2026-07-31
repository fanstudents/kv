import type { AgentSlug } from "@/lib/types";
import type { KnowledgeLevel } from "@/lib/knowledge-base-data";

export interface KnowledgeAccessUpdatePort {
  setAccess(slug: AgentSlug, level: KnowledgeLevel): Promise<void>;
}
