import { describe, expect, it, vi } from "vitest";

const helpers = vi.hoisted(() => ({
  importPdf: vi.fn(),
  listKbSources: vi.fn(),
  listKnowledgeDocs: vi.fn(),
  publishKnowledgeDocs: vi.fn(),
  removeKnowledgeDoc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/kb-import", () => ({ importPdf: helpers.importPdf, listKbSources: helpers.listKbSources }));
vi.mock("@/lib/knowledge-base", () => ({
  listKnowledgeDocs: helpers.listKnowledgeDocs,
  publishKnowledgeDocs: helpers.publishKnowledgeDocs,
  removeKnowledgeDoc: helpers.removeKnowledgeDoc,
}));

import { createSupabaseKnowledgeIngestion } from "@/adapters/knowledge-base/supabase-knowledge-ingestion";

describe("createSupabaseKnowledgeIngestion", () => {
  it("maps PDF upload to the existing pipeline", async () => {
    const result = { sourceId: "source-1" };
    const input = { buf: Buffer.from("pdf"), filename: "guide.pdf", mimeType: "application/pdf" };
    helpers.importPdf.mockResolvedValue(result);

    await expect(createSupabaseKnowledgeIngestion().importFile(input)).resolves.toBe(result);
    expect(helpers.importPdf).toHaveBeenCalledWith(input);
  });

  it("maps source and draft reads to existing helpers", async () => {
    const sources = [{ id: "source-1" }];
    const docs = [{ id: "doc-1" }];
    helpers.listKbSources.mockResolvedValue(sources);
    helpers.listKnowledgeDocs.mockResolvedValue(docs);
    const repository = createSupabaseKnowledgeIngestion();

    await expect(repository.listSources()).resolves.toBe(sources);
    await expect(repository.listDraftDocs("source-1")).resolves.toBe(docs);
    expect(helpers.listKbSources).toHaveBeenCalledOnce();
    expect(helpers.listKnowledgeDocs).toHaveBeenCalledWith({ status: "draft", sourceDocId: "source-1" });
  });

  it("maps publish to the existing helper", async () => {
    helpers.publishKnowledgeDocs.mockResolvedValue(1);
    await expect(createSupabaseKnowledgeIngestion().publish(["doc-1"])).resolves.toBe(1);
    expect(helpers.publishKnowledgeDocs).toHaveBeenCalledWith(["doc-1"]);
  });

  it("maps discard to the existing delete helper", async () => {
    helpers.removeKnowledgeDoc.mockResolvedValue("deleted");
    await expect(createSupabaseKnowledgeIngestion().remove("doc-1")).resolves.toBe("deleted");
    expect(helpers.removeKnowledgeDoc).toHaveBeenCalledWith("doc-1");
  });
});
