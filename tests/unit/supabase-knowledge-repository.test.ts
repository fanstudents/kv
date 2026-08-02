import { describe, expect, it, vi } from "vitest";

const helpers = vi.hoisted(() => ({
  addKnowledgeDoc: vi.fn(),
  listAgentAccess: vi.fn(),
  listKnowledgeDocs: vi.fn(),
  removeKnowledgeDoc: vi.fn(),
  setAgentAccess: vi.fn(),
  updateKnowledgeDoc: vi.fn(),
}));

vi.mock("@/lib/knowledge-base", () => helpers);

import { createSupabaseKnowledgeRepository } from "@/adapters/knowledge-base/supabase-knowledge-repository";

describe("createSupabaseKnowledgeRepository", () => {
  it("maps document and access reads to the existing helpers", async () => {
    const docs = [{ id: "doc-1" }];
    const access = { support: 2 };
    helpers.listKnowledgeDocs.mockResolvedValue(docs);
    helpers.listAgentAccess.mockResolvedValue(access);

    const repository = createSupabaseKnowledgeRepository();
    await expect(repository.listDocs({ status: "draft" })).resolves.toBe(docs);
    await expect(repository.listAccess()).resolves.toBe(access);
    expect(helpers.listKnowledgeDocs).toHaveBeenCalledWith({ status: "draft" });
    expect(helpers.listAgentAccess).toHaveBeenCalledOnce();
  });

  it("maps document creation to the existing helper", async () => {
    const created = { id: "doc-2" };
    helpers.addKnowledgeDoc.mockResolvedValue(created);
    const repository = createSupabaseKnowledgeRepository();

    await expect(repository.add({} as never)).resolves.toBe(created);
    expect(helpers.addKnowledgeDoc).toHaveBeenCalledWith({});
  });

  it("maps document updates to the existing helper signature", async () => {
    const updated = { id: "doc-1", title: "Guide" };
    helpers.updateKnowledgeDoc.mockResolvedValue(updated);
    const repository = createSupabaseKnowledgeRepository();

    await expect(repository.update({ id: "doc-1", patch: { title: "Guide" } })).resolves.toBe(updated);
    expect(helpers.updateKnowledgeDoc).toHaveBeenCalledWith("doc-1", { title: "Guide" });
  });

  it("maps document deletion to the existing helper", async () => {
    helpers.removeKnowledgeDoc.mockResolvedValue("deleted");
    const repository = createSupabaseKnowledgeRepository();

    await expect(repository.remove("doc-1")).resolves.toBe("deleted");
    expect(helpers.removeKnowledgeDoc).toHaveBeenCalledWith("doc-1");
  });

  it("maps access writes to the existing helper", async () => {
    helpers.setAgentAccess.mockResolvedValue(undefined);
    const repository = createSupabaseKnowledgeRepository();

    await repository.setAccess("support", 2);
    expect(helpers.setAgentAccess).toHaveBeenCalledWith("support", 2);
  });
});
