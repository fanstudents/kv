import { describe, expect, it } from "vitest";
import { parseKnowledgeBaseCrawlImportRequest } from "@/modules/knowledge-base/crawl-import-rules";

describe("knowledge base crawl import rules", () => {
  it("trims a single-page URL and applies the existing default limit", () => {
    expect(parseKnowledgeBaseCrawlImportRequest({ url: "  https://example.com/page  " })).toEqual({
      kind: "valid",
      input: { url: "https://example.com/page", mode: "single", limit: 25 },
    });
  });

  it("preserves site mode and clamps the page limit to 1..60", () => {
    expect(parseKnowledgeBaseCrawlImportRequest({ url: "https://example.com", mode: "site", limit: 999 })).toEqual({
      kind: "valid",
      input: { url: "https://example.com", mode: "site", limit: 60 },
    });
    expect(parseKnowledgeBaseCrawlImportRequest({ url: "https://example.com", mode: "site", limit: -4 })).toEqual({
      kind: "valid",
      input: { url: "https://example.com", mode: "site", limit: 1 },
    });
  });

  it("rejects missing and non-HTTP(S) URLs with the existing message", () => {
    expect(parseKnowledgeBaseCrawlImportRequest({})).toEqual({
      kind: "invalid",
      message: "請提供有效的網址（http/https）",
    });
    expect(parseKnowledgeBaseCrawlImportRequest({ url: "ftp://example.com" })).toEqual({
      kind: "invalid",
      message: "請提供有效的網址（http/https）",
    });
  });
});
