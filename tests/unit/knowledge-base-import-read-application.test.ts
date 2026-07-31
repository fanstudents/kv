import { describe, expect, it, vi } from "vitest";
import { runKnowledgeBaseImportRead } from "@/modules/knowledge-base/import-read-application";

describe("runKnowledgeBaseImportRead", () => {
  it("returns source rows for the source listing branch", async () => {
    const sources = [{ id: "source-1", filename: "guide.pdf", page_count: 2, status: "reviewing", created_at: "now" }];
    const listSources = vi.fn(async () => sources);

    await expect(runKnowledgeBaseImportRead({ kind: "sources" }, { listSources } as never)).resolves.toEqual({ sources });
    expect(listSources).toHaveBeenCalledOnce();
  });

  it("returns draft rows for a specific source id", async () => {
    const docs = [{ id: "doc-1", title: "Guide", category: "ops", level: 1 as const }];
    const listDraftDocs = vi.fn(async () => docs);

    await expect(runKnowledgeBaseImportRead({ kind: "drafts", sourceId: "source-1" }, { listDraftDocs } as never)).resolves.toEqual({ docs });
    expect(listDraftDocs).toHaveBeenCalledWith("source-1");
  });
});
