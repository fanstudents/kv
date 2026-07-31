import { describe, expect, it } from "vitest";
import { selectIndexableKnowledgeDocs } from "@/modules/knowledge-base/reindex-rules";

describe("selectIndexableKnowledgeDocs", () => {
  it("keeps only published documents with non-empty content without changing order", () => {
    const docs = [
      { id: "doc-1", content: "Guide" },
      { id: "doc-2", content: "   " },
      { id: "doc-3", content: null },
      { id: "doc-4" },
      { id: "doc-5", content: "FAQ" },
    ];

    expect(selectIndexableKnowledgeDocs(docs)).toEqual([
      { id: "doc-1", content: "Guide" },
      { id: "doc-5", content: "FAQ" },
    ]);
  });
});
