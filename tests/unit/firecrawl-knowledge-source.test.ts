import { describe, expect, it, vi } from "vitest";

const helpers = vi.hoisted(() => {
  class FakeQuotaError extends Error {}
  return {
    FakeQuotaError,
    getCreditUsage: vi.fn(),
    importUrl: vi.fn(),
    listKnowledgeDocs: vi.fn(),
    mapSite: vi.fn(),
    recheckUrlSources: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/kb-crawl", () => ({
  FirecrawlQuotaError: helpers.FakeQuotaError,
  getCreditUsage: helpers.getCreditUsage,
  importUrl: helpers.importUrl,
  mapSite: helpers.mapSite,
  recheckUrlSources: helpers.recheckUrlSources,
}));
vi.mock("@/lib/knowledge-base", () => ({ listKnowledgeDocs: helpers.listKnowledgeDocs }));

import { createFirecrawlKnowledgeSource } from "@/adapters/knowledge-base/firecrawl-knowledge-source";

describe("createFirecrawlKnowledgeSource", () => {
  it("maps preview calls and quota classification to Firecrawl", async () => {
    const credit = { remaining: 10, plan: 100, periodEnd: null };
    const links = [{ url: "https://example.com" }];
    helpers.getCreditUsage.mockResolvedValue(credit);
    helpers.mapSite.mockResolvedValue(links);
    const provider = createFirecrawlKnowledgeSource();

    await expect(provider.getCreditUsage()).resolves.toBe(credit);
    await expect(provider.mapSite("https://example.com", 200)).resolves.toBe(links);
    expect(provider.isQuotaError(new helpers.FakeQuotaError())).toBe(true);
    expect(provider.isQuotaError(new Error("other"))).toBe(false);
    expect(helpers.mapSite).toHaveBeenCalledWith("https://example.com", 200);
  });

  it("maps URL imports and draft reads to existing helpers", async () => {
    const docs = [{ id: "doc-1" }];
    helpers.importUrl.mockResolvedValue({ sourceId: "source-1" });
    helpers.listKnowledgeDocs.mockResolvedValue(docs);
    const provider = createFirecrawlKnowledgeSource();

    await expect(
      provider.importUrl({ url: "https://example.com", mode: "single", limit: 25 }),
    ).resolves.toEqual({ sourceId: "source-1" });
    await expect(provider.listDrafts("source-1")).resolves.toBe(docs);
    expect(helpers.listKnowledgeDocs).toHaveBeenCalledWith({ status: "draft", sourceDocId: "source-1" });
  });

  it("maps scheduled source rechecks to the existing helper", async () => {
    const result = { checked: 1, changed: [] };
    helpers.recheckUrlSources.mockResolvedValue(result);

    await expect(createFirecrawlKnowledgeSource().recheckUrlSources(10)).resolves.toBe(result);
    expect(helpers.recheckUrlSources).toHaveBeenCalledWith(10);
  });
});
