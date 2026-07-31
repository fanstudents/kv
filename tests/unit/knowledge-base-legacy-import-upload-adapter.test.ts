import { describe, expect, it, vi } from "vitest";

const { importPdf } = vi.hoisted(() => ({ importPdf: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/kb-import", () => ({ importPdf }));

import { createLegacyKnowledgeBaseImportUploadAdapter } from "@/adapters/knowledge-base/legacy-import-upload-adapter";

describe("createLegacyKnowledgeBaseImportUploadAdapter", () => {
  it("keeps the existing PDF pipeline behind the upload port", async () => {
    const result = {
      sourceId: "source-1",
      filename: "guide.pdf",
      pageCount: 2,
      chunkCount: 1,
      processedChunks: 1,
      candidateCount: 3,
      truncated: false,
    };
    importPdf.mockResolvedValue(result);
    const input = { buf: Buffer.from("pdf"), filename: "guide.pdf", mimeType: "application/pdf" };
    const adapter = createLegacyKnowledgeBaseImportUploadAdapter();

    await expect(adapter.importFile(input)).resolves.toBe(result);
    expect(importPdf).toHaveBeenCalledWith(input);
  });
});
