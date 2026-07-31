import type { KnowledgeDoc } from "@/lib/knowledge-base-data";
import type { KnowledgeBaseCreateInput } from "./create-rules";

export interface KnowledgeBaseCreatePort {
  add(input: KnowledgeBaseCreateInput): Promise<KnowledgeDoc>;
}
