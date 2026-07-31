import type { KnowledgeStatus } from "@/lib/knowledge-base-data";

export interface KnowledgeBaseReadQuery {
  status?: KnowledgeStatus;
  sourceDocId?: string;
}

const VALID_STATUSES: readonly KnowledgeStatus[] = ["draft", "published", "archived"];

export function parseKnowledgeBaseReadQuery(input: {
  status: string | null;
  sourceDocId: string | null;
}): KnowledgeBaseReadQuery {
  return {
    status: input.status && VALID_STATUSES.includes(input.status as KnowledgeStatus)
      ? (input.status as KnowledgeStatus)
      : undefined,
    sourceDocId: input.sourceDocId ?? undefined,
  };
}
