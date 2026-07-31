import { describe, expect, it } from "vitest";
import { parseKnowledgeBaseImportDiscardRequest } from "@/modules/knowledge-base/import-discard-rules";

describe("parseKnowledgeBaseImportDiscardRequest", () => {
  it("keeps only string ids and allows an empty selection", () => {
    expect(parseKnowledgeBaseImportDiscardRequest({ ids: ["doc-1", 2, "doc-2"] })).toEqual({
      ids: ["doc-1", "doc-2"],
    });
    expect(parseKnowledgeBaseImportDiscardRequest({ ids: [] })).toEqual({ ids: [] });
  });
});
