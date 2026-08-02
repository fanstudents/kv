import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const repository = { kind: "knowledge-repository" };
  const crawlSource = { isQuotaError: vi.fn() };
  const ingestion = { kind: "knowledge-ingestion" };
  const index = { kind: "knowledge-index" };

  return {
    repository,
    crawlSource,
    ingestion,
    index,
    createSupabaseKnowledgeRepository: vi.fn(() => repository),
    createFirecrawlKnowledgeSource: vi.fn(() => crawlSource),
    createSupabaseKnowledgeIngestion: vi.fn(() => ingestion),
    createSupabaseKnowledgeIndex: vi.fn(() => index),
    parseKnowledgeDocumentQuery: vi.fn(),
    readKnowledgeDocuments: vi.fn(),
    parseKnowledgeDocumentCreate: vi.fn(),
    createKnowledgeDocument: vi.fn(),
    parseKnowledgeDocumentUpdate: vi.fn(),
    updateKnowledgeDocument: vi.fn(),
    parseKnowledgeDocumentDelete: vi.fn(),
    deleteKnowledgeDocument: vi.fn(),
    parseKnowledgeAccessUpdate: vi.fn(),
    updateKnowledgeAccess: vi.fn(),
    parseKnowledgeCrawlPreview: vi.fn(),
    previewKnowledgeCrawl: vi.fn(),
    parseKnowledgeCrawlImport: vi.fn(),
    importKnowledgeFromUrl: vi.fn(),
    validateKnowledgeIngestionFile: vi.fn(),
    uploadKnowledgeSource: vi.fn(),
    parseKnowledgeIngestionRead: vi.fn(),
    readKnowledgeIngestion: vi.fn(),
    parseKnowledgeIngestionPublish: vi.fn(),
    publishKnowledgeDrafts: vi.fn(),
    parseKnowledgeIngestionDiscard: vi.fn(),
    discardKnowledgeDrafts: vi.fn(),
    readKnowledgeIndexStats: vi.fn(),
    rebuildKnowledgeIndex: vi.fn(),
  };
});

vi.mock("@/lib/agent-data", () => ({ AGENTS: [{ slug: "visit" }] }));
vi.mock("@/adapters/knowledge-base/supabase-knowledge-repository", () => ({
  createSupabaseKnowledgeRepository: mocks.createSupabaseKnowledgeRepository,
}));
vi.mock("@/adapters/knowledge-base/firecrawl-knowledge-source", () => ({
  createFirecrawlKnowledgeSource: mocks.createFirecrawlKnowledgeSource,
}));
vi.mock("@/adapters/knowledge-base/supabase-knowledge-ingestion", () => ({
  createSupabaseKnowledgeIngestion: mocks.createSupabaseKnowledgeIngestion,
}));
vi.mock("@/adapters/knowledge-base/supabase-knowledge-index", () => ({
  createSupabaseKnowledgeIndex: mocks.createSupabaseKnowledgeIndex,
}));
vi.mock("@/modules/knowledge-base/documents", () => ({
  parseKnowledgeDocumentQuery: mocks.parseKnowledgeDocumentQuery,
  readKnowledgeDocuments: mocks.readKnowledgeDocuments,
  parseKnowledgeDocumentCreate: mocks.parseKnowledgeDocumentCreate,
  createKnowledgeDocument: mocks.createKnowledgeDocument,
  parseKnowledgeDocumentUpdate: mocks.parseKnowledgeDocumentUpdate,
  updateKnowledgeDocument: mocks.updateKnowledgeDocument,
  parseKnowledgeDocumentDelete: mocks.parseKnowledgeDocumentDelete,
  deleteKnowledgeDocument: mocks.deleteKnowledgeDocument,
}));
vi.mock("@/modules/knowledge-base/access-policy", () => ({
  parseKnowledgeAccessUpdate: mocks.parseKnowledgeAccessUpdate,
  updateKnowledgeAccess: mocks.updateKnowledgeAccess,
}));
vi.mock("@/modules/knowledge-base/crawl-source", () => ({
  parseKnowledgeCrawlPreview: mocks.parseKnowledgeCrawlPreview,
  previewKnowledgeCrawl: mocks.previewKnowledgeCrawl,
  parseKnowledgeCrawlImport: mocks.parseKnowledgeCrawlImport,
  importKnowledgeFromUrl: mocks.importKnowledgeFromUrl,
}));
vi.mock("@/modules/knowledge-base/ingestion", () => ({
  validateKnowledgeIngestionFile: mocks.validateKnowledgeIngestionFile,
  uploadKnowledgeSource: mocks.uploadKnowledgeSource,
  parseKnowledgeIngestionRead: mocks.parseKnowledgeIngestionRead,
  readKnowledgeIngestion: mocks.readKnowledgeIngestion,
  parseKnowledgeIngestionPublish: mocks.parseKnowledgeIngestionPublish,
  publishKnowledgeDrafts: mocks.publishKnowledgeDrafts,
  parseKnowledgeIngestionDiscard: mocks.parseKnowledgeIngestionDiscard,
  discardKnowledgeDrafts: mocks.discardKnowledgeDrafts,
}));
vi.mock("@/modules/knowledge-base/search-index", () => ({
  readKnowledgeIndexStats: mocks.readKnowledgeIndexStats,
  rebuildKnowledgeIndex: mocks.rebuildKnowledgeIndex,
}));

import {
  DELETE as deleteKnowledgeBase,
  GET as getKnowledgeBase,
  PATCH as patchKnowledgeBase,
  POST as postKnowledgeBase,
} from "@/app/api/knowledge-base/route";
import { PUT as putKnowledgeAccess } from "@/app/api/knowledge-base/access/route";
import { GET as getKnowledgeCrawl, POST as postKnowledgeCrawl } from "@/app/api/knowledge-base/crawl/route";
import {
  DELETE as deleteKnowledgeImport,
  GET as getKnowledgeImport,
  POST as postKnowledgeImport,
  PUT as putKnowledgeImport,
} from "@/app/api/knowledge-base/import/route";
import { GET as getKnowledgeReindex, POST as postKnowledgeReindex } from "@/app/api/knowledge-base/reindex/route";

function jsonRequest(path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function importRequest(file: File | null) {
  return {
    formData: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(file) }),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.parseKnowledgeDocumentQuery.mockReturnValue({ status: "published", sourceDocId: undefined });
  mocks.readKnowledgeDocuments.mockResolvedValue({
    docs: [{ id: "doc-1", title: "Guide", category: "ops", level: 1 }],
    access: { visit: 2 },
  });
  mocks.parseKnowledgeDocumentCreate.mockReturnValue({
    kind: "ok",
    input: { title: "Guide", category: "ops", level: 1, kind: "doc", status: "published" },
  });
  mocks.createKnowledgeDocument.mockResolvedValue({ id: "doc-1", title: "Guide", category: "ops", level: 1 });
  mocks.parseKnowledgeDocumentUpdate.mockReturnValue({
    kind: "ok",
    input: { id: "doc-1", patch: { title: "Updated" } },
  });
  mocks.updateKnowledgeDocument.mockResolvedValue({
    kind: "ok",
    data: { id: "doc-1", title: "Updated", category: "ops", level: 1 },
  });
  mocks.parseKnowledgeDocumentDelete.mockReturnValue({ kind: "ok", id: "doc-1" });
  mocks.deleteKnowledgeDocument.mockResolvedValue({ kind: "deleted" });

  mocks.parseKnowledgeAccessUpdate.mockReturnValue({ kind: "ok", input: { agentSlug: "visit", level: 2 } });
  mocks.updateKnowledgeAccess.mockResolvedValue({ kind: "ok" });

  mocks.parseKnowledgeCrawlPreview.mockReturnValue({ kind: "credit" });
  mocks.previewKnowledgeCrawl.mockResolvedValue({ credit: { remaining: 10, plan: 20, periodEnd: null } });
  mocks.parseKnowledgeCrawlImport.mockReturnValue({
    kind: "valid",
    input: { url: "https://example.com", mode: "single", limit: 25 },
  });
  mocks.importKnowledgeFromUrl.mockResolvedValue({
    sourceId: "source-1",
    url: "https://example.com",
    mode: "single",
    pageCount: 1,
    chunkCount: 2,
    processedChunks: 2,
    candidateCount: 2,
    truncated: false,
    docs: [],
    credit: null,
  });
  mocks.crawlSource.isQuotaError.mockReturnValue(false);

  mocks.validateKnowledgeIngestionFile.mockReturnValue({ kind: "ok" });
  mocks.uploadKnowledgeSource.mockResolvedValue({
    sourceId: "source-1",
    filename: "guide.pdf",
    pageCount: 2,
    chunkCount: 4,
    processedChunks: 4,
    candidateCount: 3,
    truncated: false,
  });
  mocks.parseKnowledgeIngestionRead.mockReturnValue({ kind: "sources" });
  mocks.readKnowledgeIngestion.mockResolvedValue({ sources: [{ id: "source-1", filename: "guide.pdf" }] });
  mocks.parseKnowledgeIngestionPublish.mockReturnValue({ kind: "ok", ids: ["doc-1", "doc-2"] });
  mocks.publishKnowledgeDrafts.mockResolvedValue({ published: 2 });
  mocks.parseKnowledgeIngestionDiscard.mockReturnValue({ ids: ["doc-1", "doc-2"] });
  mocks.discardKnowledgeDrafts.mockResolvedValue({ removed: 1 });

  mocks.readKnowledgeIndexStats.mockResolvedValue({ docs: 4, chunks: 9 });
  mocks.rebuildKnowledgeIndex.mockResolvedValue({
    published: 4,
    indexable: 3,
    chunks: 9,
    stats: { docs: 4, chunks: 9 },
  });
});

describe("knowledge-base route contracts", () => {
  it("keeps the document read projection and its repository boundary", async () => {
    const response = await getKnowledgeBase(
      new NextRequest("http://localhost/api/knowledge-base?status=published&sourceDocId=source-1"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      docs: [{ id: "doc-1", title: "Guide", category: "ops", level: 1 }],
      access: { visit: 2 },
    });
    expect(mocks.parseKnowledgeDocumentQuery).toHaveBeenCalledWith({ status: "published", sourceDocId: "source-1" });
    expect(mocks.readKnowledgeDocuments).toHaveBeenCalledWith(
      { status: "published", sourceDocId: undefined },
      mocks.repository,
    );
  });

  it("rejects invalid document input before constructing a repository", async () => {
    mocks.parseKnowledgeDocumentCreate.mockReturnValue({ kind: "invalid", message: "invalid document" });

    const response = await postKnowledgeBase(jsonRequest("/api/knowledge-base", "POST", {}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid document" });
    expect(mocks.createSupabaseKnowledgeRepository).not.toHaveBeenCalled();
    expect(mocks.createKnowledgeDocument).not.toHaveBeenCalled();
  });

  it("preserves document not-found and builtin-protected response envelopes", async () => {
    mocks.updateKnowledgeDocument.mockResolvedValue({ kind: "not-found" });
    const missing = await patchKnowledgeBase(jsonRequest("/api/knowledge-base", "PATCH", { id: "missing" }));

    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toMatchObject({ error: expect.any(String) });

    mocks.deleteKnowledgeDocument.mockResolvedValue({ kind: "builtin-protected" });
    const protectedDocument = await deleteKnowledgeBase(
      new NextRequest("http://localhost/api/knowledge-base?id=builtin-1", { method: "DELETE" }),
    );

    expect(protectedDocument.status).toBe(409);
    await expect(protectedDocument.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("keeps access writes at the parsed policy boundary", async () => {
    const response = await putKnowledgeAccess(
      jsonRequest("/api/knowledge-base/access", "PUT", { agentSlug: "visit", level: 2 }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.parseKnowledgeAccessUpdate).toHaveBeenCalledWith(
      { agentSlug: "visit", level: 2 },
      [{ slug: "visit" }],
    );
    expect(mocks.updateKnowledgeAccess).toHaveBeenCalledWith(
      { kind: "ok", input: { agentSlug: "visit", level: 2 } },
      mocks.repository,
    );
  });

  it("returns the current access validation envelope before a policy write", async () => {
    mocks.parseKnowledgeAccessUpdate.mockReturnValue({ kind: "invalid", message: "invalid access" });
    mocks.updateKnowledgeAccess.mockResolvedValue({ kind: "invalid", message: "invalid access" });

    const response = await putKnowledgeAccess(jsonRequest("/api/knowledge-base/access", "PUT", {}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid access" });
    expect(mocks.createSupabaseKnowledgeRepository).toHaveBeenCalledOnce();
    expect(mocks.updateKnowledgeAccess).toHaveBeenCalledWith(
      { kind: "invalid", message: "invalid access" },
      mocks.repository,
    );
  });

  it("keeps the crawl preview success envelope", async () => {
    const response = await getKnowledgeCrawl(new NextRequest("http://localhost/api/knowledge-base/crawl"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ credit: { remaining: 10, plan: 20, periodEnd: null } });
    expect(mocks.previewKnowledgeCrawl).toHaveBeenCalledWith({ kind: "credit" }, mocks.crawlSource);
  });

  it("rejects invalid crawl input before constructing a Firecrawl source", async () => {
    mocks.parseKnowledgeCrawlPreview.mockReturnValue({ kind: "invalid", message: "invalid URL" });

    const response = await getKnowledgeCrawl(new NextRequest("http://localhost/api/knowledge-base/crawl?url=ftp://bad"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid URL" });
    expect(mocks.createFirecrawlKnowledgeSource).not.toHaveBeenCalled();
    expect(mocks.previewKnowledgeCrawl).not.toHaveBeenCalled();
  });

  it("maps crawl-preview quota and non-quota provider failures to their existing HTTP envelopes", async () => {
    mocks.previewKnowledgeCrawl.mockRejectedValueOnce(new Error("quota exhausted"));
    mocks.crawlSource.isQuotaError.mockReturnValueOnce(true);
    const quota = await getKnowledgeCrawl(new NextRequest("http://localhost/api/knowledge-base/crawl"));

    expect(quota.status).toBe(429);
    await expect(quota.json()).resolves.toEqual({ error: "quota exhausted" });

    mocks.previewKnowledgeCrawl.mockRejectedValueOnce(new Error("provider unavailable"));
    mocks.crawlSource.isQuotaError.mockReturnValueOnce(false);
    const providerFailure = await getKnowledgeCrawl(new NextRequest("http://localhost/api/knowledge-base/crawl"));

    expect(providerFailure.status).toBe(502);
    await expect(providerFailure.json()).resolves.toEqual({ error: "provider unavailable" });
  });

  it("keeps crawl import success and maps provider failures to its distinct error envelopes", async () => {
    const success = await postKnowledgeCrawl(
      jsonRequest("/api/knowledge-base/crawl", "POST", { url: "https://example.com" }),
    );
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toMatchObject({ sourceId: "source-1", pageCount: 1 });

    mocks.importKnowledgeFromUrl.mockRejectedValueOnce(new Error("quota exhausted"));
    mocks.crawlSource.isQuotaError.mockReturnValueOnce(true);
    const quota = await postKnowledgeCrawl(jsonRequest("/api/knowledge-base/crawl", "POST", { url: "https://example.com" }));
    expect(quota.status).toBe(429);
    await expect(quota.json()).resolves.toEqual({ error: "quota exhausted" });

    mocks.importKnowledgeFromUrl.mockRejectedValueOnce(new Error("provider unavailable"));
    mocks.crawlSource.isQuotaError.mockReturnValueOnce(false);
    const providerFailure = await postKnowledgeCrawl(
      jsonRequest("/api/knowledge-base/crawl", "POST", { url: "https://example.com" }),
    );
    expect(providerFailure.status).toBe(500);
    await expect(providerFailure.json()).resolves.toEqual({ error: "provider unavailable" });
  });

  it("rejects a missing PDF before validation or ingestion composition", async () => {
    const response = await postKnowledgeImport(importRequest(null));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
    expect(mocks.validateKnowledgeIngestionFile).not.toHaveBeenCalled();
    expect(mocks.createSupabaseKnowledgeIngestion).not.toHaveBeenCalled();
  });

  it("keeps invalid-PDF and oversized-PDF validation status envelopes", async () => {
    const invalidFile = new File(["not a PDF"], "guide.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    mocks.validateKnowledgeIngestionFile.mockReturnValueOnce({
      kind: "invalid",
      status: 400,
      message: "PDF required",
    });
    const invalid = await postKnowledgeImport(importRequest(invalidFile));

    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "PDF required" });

    const oversizedFile = new File(["PDF"], "large.pdf", { type: "application/pdf" });
    mocks.validateKnowledgeIngestionFile.mockReturnValueOnce({
      kind: "invalid",
      status: 413,
      message: "file too large",
    });
    const oversized = await postKnowledgeImport(importRequest(oversizedFile));

    expect(oversized.status).toBe(413);
    await expect(oversized.json()).resolves.toEqual({ error: "file too large" });
    expect(mocks.createSupabaseKnowledgeIngestion).not.toHaveBeenCalled();
  });

  it("keeps PDF upload and draft read response contracts at the ingestion boundary", async () => {
    const file = new File(["PDF contents"], "guide.pdf", { type: "application/pdf" });
    const upload = await postKnowledgeImport(importRequest(file));

    expect(upload.status).toBe(200);
    await expect(upload.json()).resolves.toMatchObject({ sourceId: "source-1", filename: "guide.pdf" });
    expect(mocks.uploadKnowledgeSource).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "guide.pdf", mimeType: "application/pdf", buf: expect.any(Buffer) }),
      mocks.ingestion,
    );

    const read = await getKnowledgeImport(new NextRequest("http://localhost/api/knowledge-base/import"));
    expect(read.status).toBe(200);
    await expect(read.json()).resolves.toEqual({ sources: [{ id: "source-1", filename: "guide.pdf" }] });
    expect(mocks.readKnowledgeIngestion).toHaveBeenCalledWith({ kind: "sources" }, mocks.ingestion);
  });

  it("keeps draft publish and discard response contracts", async () => {
    const publish = await putKnowledgeImport(
      jsonRequest("/api/knowledge-base/import", "PUT", { ids: ["doc-1", "doc-2"] }),
    );
    expect(publish.status).toBe(200);
    await expect(publish.json()).resolves.toEqual({ published: 2 });
    expect(mocks.publishKnowledgeDrafts).toHaveBeenCalledWith(["doc-1", "doc-2"], mocks.ingestion);

    const discard = await deleteKnowledgeImport(
      jsonRequest("/api/knowledge-base/import", "DELETE", { ids: ["doc-1", "doc-2"] }),
    );
    expect(discard.status).toBe(200);
    await expect(discard.json()).resolves.toEqual({ removed: 1 });
    expect(mocks.discardKnowledgeDrafts).toHaveBeenCalledWith({ ids: ["doc-1", "doc-2"] }, mocks.ingestion);
  });

  it("keeps index stats and rebuild response envelopes", async () => {
    const stats = await getKnowledgeReindex();
    expect(stats.status).toBe(200);
    await expect(stats.json()).resolves.toEqual({ stats: { docs: 4, chunks: 9 } });
    expect(mocks.readKnowledgeIndexStats).toHaveBeenCalledWith(mocks.index);

    const rebuild = await postKnowledgeReindex();
    expect(rebuild.status).toBe(200);
    await expect(rebuild.json()).resolves.toEqual({
      published: 4,
      indexable: 3,
      chunks: 9,
      stats: { docs: 4, chunks: 9 },
    });
    expect(mocks.rebuildKnowledgeIndex).toHaveBeenCalledWith(mocks.index);
  });
});
