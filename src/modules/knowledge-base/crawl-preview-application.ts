import type { KnowledgeBaseCrawlPreviewPort } from "./crawl-preview-ports";
import type { KnowledgeBaseCrawlPreviewQuery } from "./crawl-preview-rules";

export interface KnowledgeBaseCrawlPreviewResult {
  credit?: Awaited<ReturnType<KnowledgeBaseCrawlPreviewPort["getCreditUsage"]>>;
  count?: number;
  links?: Awaited<ReturnType<KnowledgeBaseCrawlPreviewPort["mapSite"]>>;
}

export async function runKnowledgeBaseCrawlPreview(
  query: Exclude<KnowledgeBaseCrawlPreviewQuery, { kind: "invalid" }>,
  port: KnowledgeBaseCrawlPreviewPort
): Promise<KnowledgeBaseCrawlPreviewResult> {
  if (query.kind === "credit") return { credit: await port.getCreditUsage() };
  const [links, credit] = await Promise.all([port.mapSite(query.url, 200), port.getCreditUsage()]);
  return { count: links.length, links: links.slice(0, 30), credit };
}
