import type { KnowledgeDoc } from "@/lib/knowledge-base-data";
import type { KnowledgeBaseCreatePort } from "./create-ports";
import type { KnowledgeBaseCreateInput } from "./create-rules";

export async function runKnowledgeBaseCreate(
  input: KnowledgeBaseCreateInput,
  port: KnowledgeBaseCreatePort,
): Promise<KnowledgeDoc> {
  return port.add(input);
}
