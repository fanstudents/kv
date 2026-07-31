import { describe, expect, it } from "vitest";
import { parseKnowledgeBaseCrawlPreviewQuery } from "@/modules/knowledge-base/crawl-preview-rules";

describe("parseKnowledgeBaseCrawlPreviewQuery", () => {
  it("uses the credit branch when no url is supplied", () => {
    expect(parseKnowledgeBaseCrawlPreviewQuery(null)).toEqual({ kind: "credit" });
  });

  it("accepts http/https and preserves the raw url", () => {
    expect(parseKnowledgeBaseCrawlPreviewQuery("https://example.com/path#section")).toEqual({
      kind: "site",
      url: "https://example.com/path#section",
    });
  });

  it("rejects non-http protocols with the existing message", () => {
    expect(parseKnowledgeBaseCrawlPreviewQuery("ftp://example.com")).toEqual({
      kind: "invalid",
      message: "請提供有效的網址",
    });
  });
});
