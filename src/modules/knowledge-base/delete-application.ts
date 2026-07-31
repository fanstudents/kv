import type { KnowledgeBaseDeleteOutcome, KnowledgeBaseDeletePort } from "./delete-ports";

export type KnowledgeBaseDeleteResult = { kind: KnowledgeBaseDeleteOutcome };

export async function runKnowledgeBaseDelete(
  id: string,
  port: KnowledgeBaseDeletePort,
): Promise<KnowledgeBaseDeleteResult> {
  return { kind: await port.remove(id) };
}
