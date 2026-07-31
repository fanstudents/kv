import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_BASE_IMPORT_MAX_BYTES,
  validateKnowledgeBaseImportFile,
} from "@/modules/knowledge-base/import-upload-rules";

describe("validateKnowledgeBaseImportFile", () => {
  it("accepts PDF names case-insensitively", () => {
    expect(validateKnowledgeBaseImportFile({ name: "Guide.PDF", size: 10 })).toEqual({ kind: "ok" });
  });

  it("preserves extension and size validation messages/statuses", () => {
    expect(validateKnowledgeBaseImportFile({ name: "Guide.docx", size: 10 })).toEqual({
      kind: "invalid",
      status: 400,
      message: "目前只支援 PDF；Word／簡報請先另存成 PDF",
    });
    expect(validateKnowledgeBaseImportFile({ name: "Guide.pdf", size: KNOWLEDGE_BASE_IMPORT_MAX_BYTES + 1 })).toEqual({
      kind: "invalid",
      status: 413,
      message: "檔案超過 12MB，請先拆成多份",
    });
  });
});
