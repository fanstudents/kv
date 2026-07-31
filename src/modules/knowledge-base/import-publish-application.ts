import type { KnowledgeBaseImportPublishPort } from "./import-publish-ports";

export interface KnowledgeBaseImportPublishResult {
  published: number;
}

export async function runKnowledgeBaseImportPublish(
  ids: string[],
  port: KnowledgeBaseImportPublishPort
): Promise<KnowledgeBaseImportPublishResult> {
  return { published: await port.publish(ids) };
}
