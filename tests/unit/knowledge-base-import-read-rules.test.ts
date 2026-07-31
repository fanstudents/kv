import { describe, expect, it } from "vitest";
import { parseKnowledgeBaseImportReadQuery } from "@/modules/knowledge-base/import-read-rules";

describe("parseKnowledgeBaseImportReadQuery", () => {
  it("lists sources when sourceId is absent or empty", () => {
    expect(parseKnowledgeBaseImportReadQuery(null)).toEqual({ kind: "sources" });
    expect(parseKnowledgeBaseImportReadQuery("")).toEqual({ kind: "sources" });
  });

  it("preserves a provided source id for draft lookup", () => {
    expect(parseKnowledgeBaseImportReadQuery(" source-1 ")).toEqual({ kind: "drafts", sourceId: " source-1 " });
  });
});
