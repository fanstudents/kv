import { describe, expect, it, vi } from "vitest";
import {
  KNOWLEDGE_BASE_IMPORT_MAX_BYTES,
  discardKnowledgeDrafts,
  parseKnowledgeIngestionDiscard,
  parseKnowledgeIngestionPublish,
  parseKnowledgeIngestionRead,
  publishKnowledgeDrafts,
  readKnowledgeIngestion,
  uploadKnowledgeSource,
  validateKnowledgeIngestionFile,
} from "@/modules/knowledge-base/ingestion";

describe("knowledge ingestion rules", () => {
  it("accepts PDF names case-insensitively", () => {
    expect(validateKnowledgeIngestionFile({ name: "Guide.PDF", size: 10 })).toEqual({ kind: "ok" });
  });

  it("preserves extension and size validation messages/statuses", () => {
    expect(validateKnowledgeIngestionFile({ name: "Guide.docx", size: 10 })).toEqual({
      kind: "invalid",
      status: 400,
      message: "目前只支援 PDF；Word／簡報請先另存成 PDF",
    });
    expect(validateKnowledgeIngestionFile({ name: "Guide.pdf", size: KNOWLEDGE_BASE_IMPORT_MAX_BYTES + 1 })).toEqual({
      kind: "invalid",
      status: 413,
      message: "檔案超過 12MB，請先拆成多份",
    });
  });

  it("lists sources when sourceId is absent or empty", () => {
    expect(parseKnowledgeIngestionRead(null)).toEqual({ kind: "sources" });
    expect(parseKnowledgeIngestionRead("")).toEqual({ kind: "sources" });
  });

  it("preserves a provided source id for draft lookup", () => {
    expect(parseKnowledgeIngestionRead(" source-1 ")).toEqual({ kind: "drafts", sourceId: " source-1 " });
  });

  it("keeps only string publish ids and rejects an empty selection", () => {
    expect(parseKnowledgeIngestionPublish({ ids: ["doc-1", 2, "doc-2"] })).toEqual({
      kind: "ok",
      ids: ["doc-1", "doc-2"],
    });
    expect(parseKnowledgeIngestionPublish({ ids: [] })).toEqual({
      kind: "invalid",
      message: "沒有指定要發布的條目",
    });
  });

  it("keeps only string discard ids and allows an empty selection", () => {
    expect(parseKnowledgeIngestionDiscard({ ids: ["doc-1", 2, "doc-2"] })).toEqual({
      ids: ["doc-1", "doc-2"],
    });
    expect(parseKnowledgeIngestionDiscard({ ids: [] })).toEqual({ ids: [] });
  });
});

describe("knowledge ingestion use cases", () => {
  it("delegates upload input and preserves the result", async () => {
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

    await expect(uploadKnowledgeSource(input, { importFile } as never)).resolves.toEqual(result);
    expect(importFile).toHaveBeenCalledWith(input);
  });

  it("returns source rows for source listing", async () => {
    const sources = [{ id: "source-1", filename: "guide.pdf", page_count: 2, status: "reviewing", created_at: "now" }];
    const listSources = vi.fn(async () => sources);

    await expect(readKnowledgeIngestion({ kind: "sources" }, { listSources } as never)).resolves.toEqual({ sources });
    expect(listSources).toHaveBeenCalledOnce();
  });

  it("returns draft rows for a specific source id", async () => {
    const docs = [{ id: "doc-1", title: "Guide", category: "ops", level: 1 as const }];
    const listDraftDocs = vi.fn(async () => docs);

    await expect(
      readKnowledgeIngestion({ kind: "drafts", sourceId: "source-1" }, { listDraftDocs } as never),
    ).resolves.toEqual({ docs });
    expect(listDraftDocs).toHaveBeenCalledWith("source-1");
  });

  it("delegates selected ids and preserves the published count", async () => {
    const publish = vi.fn(async () => 2);
    await expect(publishKnowledgeDrafts(["doc-1", "doc-2"], { publish } as never)).resolves.toEqual({
      published: 2,
    });
    expect(publish).toHaveBeenCalledWith(["doc-1", "doc-2"]);
  });

  it("discards sequentially and counts only deleted outcomes", async () => {
    const calls: string[] = [];
    const remove = vi.fn(async (id: string) => {
      calls.push(id);
      if (id === "doc-1") return "deleted" as const;
      if (id === "doc-2") return "not-found" as const;
      return "builtin-protected" as const;
    });

    await expect(
      discardKnowledgeDrafts({ ids: ["doc-1", "doc-2", "doc-3"] }, { remove } as never),
    ).resolves.toEqual({ removed: 1 });
    expect(calls).toEqual(["doc-1", "doc-2", "doc-3"]);
  });
});
