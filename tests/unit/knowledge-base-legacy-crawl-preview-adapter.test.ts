import { describe, expect, it, vi } from "vitest";

const { FakeQuotaError, getCreditUsage, mapSite } = vi.hoisted(() => {
  class FakeQuotaError extends Error {}
  return { FakeQuotaError, getCreditUsage: vi.fn(), mapSite: vi.fn() };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/kb-crawl", () => ({
  FirecrawlQuotaError: FakeQuotaError,
  getCreditUsage,
  mapSite,
}));

import { createLegacyKnowledgeBaseCrawlPreviewAdapter } from "@/adapters/knowledge-base/legacy-crawl-preview-adapter";

describe("createLegacyKnowledgeBaseCrawlPreviewAdapter", () => {
  it("keeps Firecrawl reads and quota classification behind the preview port", async () => {
    const credit = { remaining: 10, plan: 100, periodEnd: null };
    const links = [{ url: "https://example.com" }];
    getCreditUsage.mockResolvedValue(credit);
    mapSite.mockResolvedValue(links);
    const adapter = createLegacyKnowledgeBaseCrawlPreviewAdapter();

    await expect(adapter.getCreditUsage()).resolves.toBe(credit);
    await expect(adapter.mapSite("https://example.com", 200)).resolves.toBe(links);
    expect(adapter.isQuotaError(new FakeQuotaError())).toBe(true);
    expect(adapter.isQuotaError(new Error("other"))).toBe(false);
    expect(getCreditUsage).toHaveBeenCalledOnce();
    expect(mapSite).toHaveBeenCalledWith("https://example.com", 200);
  });
});
