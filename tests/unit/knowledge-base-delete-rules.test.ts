import { describe, expect, it } from "vitest";
import { parseKnowledgeBaseDeleteRequest } from "@/modules/knowledge-base/delete-rules";

describe("parseKnowledgeBaseDeleteRequest", () => {
  it("keeps a valid id unchanged", () => {
    expect(parseKnowledgeBaseDeleteRequest("doc-1")).toEqual({ kind: "ok", id: "doc-1" });
  });

  it("keeps missing-id validation", () => {
    expect(parseKnowledgeBaseDeleteRequest(null)).toEqual({ kind: "invalid", message: "缺少 id" });
    expect(parseKnowledgeBaseDeleteRequest("")).toEqual({ kind: "invalid", message: "缺少 id" });
  });
});
