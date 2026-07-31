import { describe, expect, it, vi } from "vitest";
import type { AgentSlug } from "@/lib/types";
import type { KnowledgeLevel } from "@/lib/knowledge-base-data";
import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  parseKnowledgeDocumentCreate,
  parseKnowledgeDocumentDelete,
  parseKnowledgeDocumentQuery,
  parseKnowledgeDocumentUpdate,
  readKnowledgeDocuments,
  updateKnowledgeDocument,
} from "@/modules/knowledge-base/documents";

describe("knowledge document rules", () => {
  it("keeps supported read filters", () => {
    expect(parseKnowledgeDocumentQuery({ status: "draft", sourceDocId: "source-1" })).toEqual({
      status: "draft",
      sourceDocId: "source-1",
    });
  });

  it("ignores unsupported status without changing empty-value semantics", () => {
    expect(parseKnowledgeDocumentQuery({ status: "unknown", sourceDocId: "" })).toEqual({
      status: undefined,
      sourceDocId: "",
    });
    expect(parseKnowledgeDocumentQuery({ status: null, sourceDocId: null })).toEqual({
      status: undefined,
      sourceDocId: undefined,
    });
  });

  it("normalizes valid create payloads", () => {
    expect(
      parseKnowledgeDocumentCreate({
        title: "  Guide  ",
        category: " ",
        level: "2",
        content: "  body  ",
        kind: "faq",
        status: "draft",
      }),
    ).toEqual({
      kind: "ok",
      input: {
        title: "Guide",
        category: "未分類",
        level: 2,
        content: "body",
        kind: "faq",
        status: "draft",
      },
    });
  });

  it("preserves create validation and unsupported-value defaults", () => {
    expect(parseKnowledgeDocumentCreate({ title: "", level: 1 })).toEqual({
      kind: "invalid",
      message: "缺少 title 或 level 不合法",
    });
    expect(parseKnowledgeDocumentCreate({ title: "Guide", level: 4, kind: "other", status: "other" })).toEqual({
      kind: "ok",
      input: {
        title: "Guide",
        category: "未分類",
        level: 4,
        content: undefined,
        kind: "doc",
        status: "published",
      },
    });
  });

  it("preserves update coercion and content whitespace", () => {
    expect(
      parseKnowledgeDocumentUpdate({
        id: "doc-1",
        title: "  Guide  ",
        category: "  ops  ",
        level: "3",
        content: "  raw content  ",
        kind: "faq",
        status: "draft",
        owner: "ops",
        reviewAt: null,
      }),
    ).toEqual({
      kind: "ok",
      input: {
        id: "doc-1",
        patch: {
          title: "Guide",
          category: "ops",
          level: 3,
          content: "  raw content  ",
          kind: "faq",
          status: "draft",
          owner: "ops",
          reviewAt: null,
        },
      },
    });
  });

  it("preserves update validation order and messages", () => {
    expect(parseKnowledgeDocumentUpdate({})).toEqual({ kind: "invalid", message: "缺少 id" });
    expect(parseKnowledgeDocumentUpdate({ id: "doc-1", level: 9 })).toEqual({
      kind: "invalid",
      message: "level 不合法",
    });
    expect(parseKnowledgeDocumentUpdate({ id: "doc-1", status: "other" })).toEqual({
      kind: "invalid",
      message: "status 不合法",
    });
    expect(parseKnowledgeDocumentUpdate({ id: "doc-1", kind: "other" })).toEqual({
      kind: "invalid",
      message: "kind 不合法",
    });
  });

  it("keeps a valid delete id unchanged", () => {
    expect(parseKnowledgeDocumentDelete("doc-1")).toEqual({ kind: "ok", id: "doc-1" });
  });

  it("preserves missing delete-id validation", () => {
    expect(parseKnowledgeDocumentDelete(null)).toEqual({ kind: "invalid", message: "缺少 id" });
    expect(parseKnowledgeDocumentDelete("")).toEqual({ kind: "invalid", message: "缺少 id" });
  });
});

describe("knowledge document use cases", () => {
  it("loads docs and access in parallel and preserves both result shapes", async () => {
    const docs = [{ id: "doc-1", title: "Guide", category: "ops", level: 1 as const }];
    const access = { support: 2 } as unknown as Record<AgentSlug, KnowledgeLevel>;
    const repository = {
      listDocs: vi.fn(async () => docs),
      listAccess: vi.fn(async () => access),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    await expect(readKnowledgeDocuments({ status: "published" }, repository)).resolves.toEqual({ docs, access });
    expect(repository.listDocs).toHaveBeenCalledWith({ status: "published" });
    expect(repository.listAccess).toHaveBeenCalledOnce();
  });

  it("delegates create and returns the created document", async () => {
    const input = {
      title: "Guide",
      category: "未分類",
      level: 1 as const,
      kind: "doc" as const,
      status: "published" as const,
    };
    const doc = { id: "doc-1", title: input.title, category: input.category, level: input.level };
    const add = vi.fn(async () => doc);
    await expect(createKnowledgeDocument(input, { add } as never)).resolves.toBe(doc);
    expect(add).toHaveBeenCalledWith(input);
  });

  it("preserves update success and not-found outcomes", async () => {
    const doc = { id: "doc-1", title: "Guide", category: "ops", level: 1 as const };
    const updateInput = { id: "doc-1", patch: { title: "Guide" } };
    await expect(updateKnowledgeDocument(updateInput, { update: vi.fn(async () => doc) } as never)).resolves.toEqual({
      kind: "ok",
      data: doc,
    });
    await expect(updateKnowledgeDocument(updateInput, { update: vi.fn(async () => null) } as never)).resolves.toEqual({
      kind: "not-found",
    });
  });

  it("maps update provider failures to the existing error contract", async () => {
    const updateInput = { id: "doc-1", patch: { title: "Guide" } };
    await expect(
      updateKnowledgeDocument(
        updateInput,
        { update: vi.fn(async () => { throw new Error("provider failed"); }) } as never,
      ),
    ).resolves.toEqual({ kind: "error", message: "provider failed" });
    await expect(
      updateKnowledgeDocument(
        updateInput,
        { update: vi.fn(async () => { throw "unknown"; }) } as never,
      ),
    ).resolves.toEqual({ kind: "error", message: "更新失敗" });
  });

  it("preserves every delete outcome", async () => {
    for (const outcome of ["deleted", "not-found", "builtin-protected"] as const) {
      await expect(
        deleteKnowledgeDocument("doc-1", { remove: vi.fn(async () => outcome) } as never),
      ).resolves.toEqual({ kind: outcome });
    }
  });
});
