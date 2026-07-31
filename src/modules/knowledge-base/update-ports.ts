import type { KnowledgeDoc } from "@/lib/knowledge-base-data";
import type { KnowledgeBaseUpdateInput } from "./update-rules";

export interface KnowledgeBaseUpdatePort {
  update(input: KnowledgeBaseUpdateInput): Promise<KnowledgeDoc | null>;
}
