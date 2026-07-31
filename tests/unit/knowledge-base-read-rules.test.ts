import { describe, expect, it } from "vitest";
import { parseKnowledgeBaseReadQuery } from "@/modules/knowledge-base/read-rules";

describe("parseKnowledgeBaseReadQuery", () => {
  it("keeps supported status and source filters", () => {
    expect(parseKnowledgeBaseReadQuery({ status: "draft", sourceDocId: "source-1" })).toEqual({
      status: "draft",
      sourceDocId: "source-1",
    });
  });

  it("ignores unsupported status while preserving empty source input semantics", () => {
    expect(parseKnowledgeBaseReadQuery({ status: "unknown", sourceDocId: "" })).toEqual({
      status: undefined,
      sourceDocId: "",
    });
    expect(parseKnowledgeBaseReadQuery({ status: null, sourceDocId: null })).toEqual({
      status: undefined,
      sourceDocId: undefined,
    });
  });
});
