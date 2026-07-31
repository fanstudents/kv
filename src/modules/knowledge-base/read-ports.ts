import type { AgentSlug } from "@/lib/types";
import type { KnowledgeDoc, KnowledgeLevel } from "@/lib/knowledge-base-data";
import type { KnowledgeBaseReadQuery } from "./read-rules";

export interface KnowledgeBaseReadPort {
  listDocs(filter: KnowledgeBaseReadQuery): Promise<KnowledgeDoc[]>;
  listAccess(): Promise<Record<AgentSlug, KnowledgeLevel>>;
}
