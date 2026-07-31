import { describe, expect, it } from "vitest";
import { parseKnowledgeBaseCreateRequest } from "@/modules/knowledge-base/create-rules";

describe("parseKnowledgeBaseCreateRequest", () => {
  it("normalizes a valid document payload and keeps defaults", () => {
    expect(
      parseKnowledgeBaseCreateRequest({
        title: "  Guide  ",
        category: " ",
        level: "2",
        content: "  body  ",
        kind: "faq",
        status: "draft",
      }),
    ).toEqual({
      kind: "ok",
      input: {
        title: "Guide",
        category: "未分類",
        level: 2,
        content: "body",
        kind: "faq",
        status: "draft",
      },
    });
  });

  it("keeps invalid-input and unsupported-value behavior", () => {
    expect(parseKnowledgeBaseCreateRequest({ title: "", level: 1 })).toEqual({
      kind: "invalid",
      message: "缺少 title 或 level 不合法",
    });
    expect(parseKnowledgeBaseCreateRequest({ title: "Guide", level: 4, kind: "other", status: "other" })).toEqual({
      kind: "ok",
      input: {
        title: "Guide",
        category: "未分類",
        level: 4,
        content: undefined,
        kind: "doc",
        status: "published",
      },
    });
  });
});
