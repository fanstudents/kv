import type { AgentSlug } from "@/lib/types";
import type { KnowledgeDoc, KnowledgeLevel } from "@/lib/knowledge-base-data";
import type { KnowledgeBaseReadPort } from "./read-ports";
import type { KnowledgeBaseReadQuery } from "./read-rules";

export interface KnowledgeBaseReadResult {
  docs: KnowledgeDoc[];
  access: Record<AgentSlug, KnowledgeLevel>;
}

export async function runKnowledgeBaseRead(
  filter: KnowledgeBaseReadQuery,
  port: KnowledgeBaseReadPort,
): Promise<KnowledgeBaseReadResult> {
  const [docs, access] = await Promise.all([port.listDocs(filter), port.listAccess()]);
  return { docs, access };
}
