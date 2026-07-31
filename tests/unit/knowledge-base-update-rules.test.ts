import { describe, expect, it } from "vitest";
import { parseKnowledgeBaseUpdateRequest } from "@/modules/knowledge-base/update-rules";

describe("parseKnowledgeBaseUpdateRequest", () => {
  it("preserves patch field coercion and content whitespace semantics", () => {
    expect(
      parseKnowledgeBaseUpdateRequest({
        id: "doc-1",
        title: "  Guide  ",
        category: "  ops  ",
        level: "3",
        content: "  raw content  ",
        kind: "faq",
        status: "draft",
        owner: "ops",
        reviewAt: null,
      }),
    ).toEqual({
      kind: "ok",
      input: {
        id: "doc-1",
        patch: {
          title: "Guide",
          category: "ops",
          level: 3,
          content: "  raw content  ",
          kind: "faq",
          status: "draft",
          owner: "ops",
          reviewAt: null,
        },
      },
    });
  });

  it("keeps validation order and existing error messages", () => {
    expect(parseKnowledgeBaseUpdateRequest({})).toEqual({ kind: "invalid", message: "缺少 id" });
    expect(parseKnowledgeBaseUpdateRequest({ id: "doc-1", level: 9 })).toEqual({
      kind: "invalid",
      message: "level 不合法",
    });
    expect(parseKnowledgeBaseUpdateRequest({ id: "doc-1", status: "other" })).toEqual({
      kind: "invalid",
      message: "status 不合法",
    });
    expect(parseKnowledgeBaseUpdateRequest({ id: "doc-1", kind: "other" })).toEqual({
      kind: "invalid",
      message: "kind 不合法",
    });
  });
});
