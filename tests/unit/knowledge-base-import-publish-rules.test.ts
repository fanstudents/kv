import { describe, expect, it } from "vitest";
import { parseKnowledgeBaseImportPublishRequest } from "@/modules/knowledge-base/import-publish-rules";

describe("parseKnowledgeBaseImportPublishRequest", () => {
  it("keeps only string ids and rejects an empty selection", () => {
    expect(parseKnowledgeBaseImportPublishRequest({ ids: ["doc-1", 2, "doc-2"] })).toEqual({
      kind: "ok",
      ids: ["doc-1", "doc-2"],
    });
    expect(parseKnowledgeBaseImportPublishRequest({ ids: [] })).toEqual({
      kind: "invalid",
      message: "沒有指定要發布的條目",
    });
  });
});
