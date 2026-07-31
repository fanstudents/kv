import { describe, expect, it, vi } from "vitest";
import { runKnowledgeBaseImportUpload } from "@/modules/knowledge-base/import-upload-application";

describe("runKnowledgeBaseImportUpload", () => {
  it("delegates the existing import input and preserves the result", async () => {
    const result = {
      sourceId: "source-1",
      filename: "guide.pdf",
      pageCount: 2,
      chunkCount: 1,
      processedChunks: 1,
      candidateCount: 3,
      truncated: false,
    };
    const importFile = vi.fn(async () => result);
    const input = { buf: Buffer.from("pdf"), filename: "guide.pdf", mimeType: "application/pdf" };

    await expect(runKnowledgeBaseImportUpload(input, { importFile })).resolves.toEqual(result);
    expect(importFile).toHaveBeenCalledWith(input);
  });
});
