import type { KnowledgeBaseRecheckPort, KnowledgeBaseRecheckResult } from "./recheck-ports";

export const KNOWLEDGE_BASE_RECHECK_LIMIT = 10;

export interface KnowledgeBaseRecheckResponse extends KnowledgeBaseRecheckResult {
  ok: true;
}

export async function runKnowledgeBaseRecheck(
  port: KnowledgeBaseRecheckPort
): Promise<KnowledgeBaseRecheckResponse> {
  const result = await port.recheckUrlSources(KNOWLEDGE_BASE_RECHECK_LIMIT);
  return { ok: true, ...result };
}
