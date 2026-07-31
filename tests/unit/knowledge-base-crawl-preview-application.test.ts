import { describe, expect, it, vi } from "vitest";
import { runKnowledgeBaseCrawlPreview } from "@/modules/knowledge-base/crawl-preview-application";

describe("runKnowledgeBaseCrawlPreview", () => {
  it("returns only credit usage for the credit branch", async () => {
    const credit = { remaining: 10, plan: 100, periodEnd: "tomorrow" };
    const getCreditUsage = vi.fn(async () => credit);

    await expect(runKnowledgeBaseCrawlPreview({ kind: "credit" }, { getCreditUsage } as never)).resolves.toEqual({ credit });
    expect(getCreditUsage).toHaveBeenCalledOnce();
  });

  it("maps links with a count and keeps only the first 30", async () => {
    const links = Array.from({ length: 35 }, (_, i) => ({ url: `https://example.com/${i}` }));
    const mapSite = vi.fn(async () => links);
    const getCreditUsage = vi.fn(async () => null);

    const result = await runKnowledgeBaseCrawlPreview(
      { kind: "site", url: "https://example.com" },
      { mapSite, getCreditUsage } as never
    );

    expect(result).toEqual({ count: 35, links: links.slice(0, 30), credit: null });
    expect(mapSite).toHaveBeenCalledWith("https://example.com", 200);
    expect(getCreditUsage).toHaveBeenCalledOnce();
  });
});
