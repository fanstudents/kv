import { describe, expect, it, vi } from "vitest";

const helpers = vi.hoisted(() => ({
  addKnowledgeDoc: vi.fn(),
  importPdf: vi.fn(),
  indexDocs: vi.fn(),
  indexStats: vi.fn(),
  listAgentAccess: vi.fn(),
  listKbSources: vi.fn(),
  listKnowledgeDocs: vi.fn(),
  publishKnowledgeDocs: vi.fn(),
  removeKnowledgeDoc: vi.fn(),
  setAgentAccess: vi.fn(),
  updateKnowledgeDoc: vi.fn(),
}));

vi.mock("@/lib/kb-import", () => ({
  importPdf: helpers.importPdf,
  listKbSources: helpers.listKbSources,
}));
vi.mock("@/lib/kb-search", () => ({
  indexDocs: helpers.indexDocs,
  indexStats: helpers.indexStats,
}));
vi.mock("@/lib/knowledge-base", () => ({
  addKnowledgeDoc: helpers.addKnowledgeDoc,
  listAgentAccess: helpers.listAgentAccess,
  listKnowledgeDocs: helpers.listKnowledgeDocs,
  publishKnowledgeDocs: helpers.publishKnowledgeDocs,
  removeKnowledgeDoc: helpers.removeKnowledgeDoc,
  setAgentAccess: helpers.setAgentAccess,
  updateKnowledgeDoc: helpers.updateKnowledgeDoc,
}));

import {
  supabaseKnowledgeIndexRepository,
  supabaseKnowledgeIngestionRepository,
  supabaseKnowledgeRepository,
} from "@/adapters/knowledge-base/supabase-knowledge-adapters";

describe("Supabase knowledge compatibility adapters", () => {
  it("keeps document signature translation and access operations in one domain boundary", async () => {
    helpers.updateKnowledgeDoc.mockResolvedValue({ id: "doc-1" });

    await supabaseKnowledgeRepository.update({ id: "doc-1", patch: { title: "Guide" } });
    await supabaseKnowledgeRepository.setAccess("support", 2);

    expect(helpers.updateKnowledgeDoc).toHaveBeenCalledWith("doc-1", { title: "Guide" });
    expect(helpers.setAgentAccess).toHaveBeenCalledWith("support", 2);
  });

  it("keeps source-scoped drafts and publish operations in the ingestion boundary", async () => {
    helpers.listKnowledgeDocs.mockResolvedValue([]);
    helpers.publishKnowledgeDocs.mockResolvedValue(1);

    await supabaseKnowledgeIngestionRepository.listDraftDocs("source-1");
    await supabaseKnowledgeIngestionRepository.publish(["doc-1"]);

    expect(helpers.listKnowledgeDocs).toHaveBeenCalledWith({ status: "draft", sourceDocId: "source-1" });
    expect(helpers.publishKnowledgeDocs).toHaveBeenCalledWith(["doc-1"]);
  });

  it("keeps published selection and index helpers in the search boundary", async () => {
    helpers.listKnowledgeDocs.mockResolvedValue([]);
    helpers.indexDocs.mockResolvedValue(1);

    await supabaseKnowledgeIndexRepository.listPublishedDocs();
    await supabaseKnowledgeIndexRepository.indexDocs(["doc-1"]);

    expect(helpers.listKnowledgeDocs).toHaveBeenCalledWith({ status: "published" });
    expect(helpers.indexDocs).toHaveBeenCalledWith(["doc-1"]);
  });
});
