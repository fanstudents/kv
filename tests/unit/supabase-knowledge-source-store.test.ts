import { beforeEach, describe, expect, it, vi } from "vitest";

const getMainSupabase = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import {
  checkInUrlSource,
  createUrlSource,
  findUrlSourceByChecksum,
  listUrlSourcesForRecheck,
  markUrlSourceFailed,
  refreshUrlSource,
} from "@/adapters/knowledge-base/supabase-knowledge-source-store";

beforeEach(() => vi.clearAllMocks());

describe("Supabase knowledge URL source store", () => {
  it("maps URL source identity reads and preserves lookup failures", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "source-1", content_hash: "hash-1" }, error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    getMainSupabase.mockReturnValue({ from: () => query });

    await expect(findUrlSourceByChecksum("checksum-1")).resolves.toEqual({
      id: "source-1",
      contentHash: "hash-1",
    });
    expect(query.eq).toHaveBeenCalledWith("checksum", "checksum-1");

    query.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "lookup failed" } });
    await expect(findUrlSourceByChecksum("checksum-2")).rejects.toThrow("Knowledge source lookup failed: lookup failed");
  });

  it("keeps source check-in, refresh, and failure transitions on kb_sources", async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn(() => ({ eq }));
    getMainSupabase.mockReturnValue({ from: () => ({ update }) });

    await checkInUrlSource("source-1", "2026-08-14T00:00:00.000Z");
    await refreshUrlSource({
      sourceId: "source-1",
      pageCount: 2,
      charCount: 120,
      extractedText: "guide",
      contentHash: "hash-2",
      lastCheckedAt: "2026-08-14T00:00:00.000Z",
      updatedAt: "2026-08-14T00:00:00.000Z",
    });
    await markUrlSourceFailed("source-1", "conversion unavailable", "2026-08-14T00:00:00.000Z");

    expect(update).toHaveBeenNthCalledWith(1, { last_checked_at: "2026-08-14T00:00:00.000Z" });
    expect(update).toHaveBeenNthCalledWith(2, {
      page_count: 2,
      char_count: 120,
      status: "converting",
      extracted_text: "guide",
      content_hash: "hash-2",
      last_checked_at: "2026-08-14T00:00:00.000Z",
      updated_at: "2026-08-14T00:00:00.000Z",
    });
    expect(update).toHaveBeenNthCalledWith(3, {
      status: "failed",
      error_detail: "conversion unavailable",
      updated_at: "2026-08-14T00:00:00.000Z",
    });
  });

  it("creates a URL source with the existing row contract", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "source-new" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    getMainSupabase.mockReturnValue({ from: () => ({ insert }) });

    await expect(
      createUrlSource({
        filename: "Guide",
        sourceType: "url",
        url: "https://example.com/guide",
        byteSize: 120,
        checksum: "checksum-1",
        contentHash: "hash-1",
        pageCount: 1,
        charCount: 120,
        extractedText: "guide",
        lastCheckedAt: "2026-08-14T00:00:00.000Z",
      }),
    ).resolves.toBe("source-new");

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "Guide",
        source_type: "url",
        url: "https://example.com/guide",
        status: "converting",
      }),
    );
  });

  it("maps recheck rows and keeps source-list errors visible", async () => {
    const query = {
      select: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: "source-1", url: "https://example.com", source_type: "url", content_hash: "hash-1" }],
        error: null,
      }),
    };
    query.select.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.order.mockReturnValue(query);
    getMainSupabase.mockReturnValue({ from: () => query });

    await expect(listUrlSourcesForRecheck(10)).resolves.toEqual([
      { id: "source-1", url: "https://example.com", sourceType: "url", contentHash: "hash-1" },
    ]);
    expect(query.limit).toHaveBeenCalledWith(10);

    query.limit.mockResolvedValueOnce({ data: null, error: { message: "list failed" } });
    await expect(listUrlSourcesForRecheck(10)).rejects.toThrow("Knowledge source recheck list failed: list failed");
  });
});
