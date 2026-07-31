import type { KnowledgeBaseImportDiscardPort } from "./import-discard-ports";
import type { KnowledgeBaseImportDiscardRequest } from "./import-discard-rules";

export interface KnowledgeBaseImportDiscardResult {
  removed: number;
}

export async function runKnowledgeBaseImportDiscard(
  request: KnowledgeBaseImportDiscardRequest,
  port: KnowledgeBaseImportDiscardPort
): Promise<KnowledgeBaseImportDiscardResult> {
  let removed = 0;
  for (const id of request.ids) {
    if ((await port.remove(id)) === "deleted") removed += 1;
  }
  return { removed };
}
