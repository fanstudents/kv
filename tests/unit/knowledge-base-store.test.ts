import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase, indexDocs } = vi.hoisted(() => ({
  getMainSupabase: vi.fn(),
  indexDocs: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));
vi.mock("@/adapters/knowledge-base/supabase-knowledge-index", () => ({
  indexDocs,
}));

import {
  citeKnowledge,
  getAgentMaxLevel,
  listAgentAccess,
  listKnowledgeDocs,
  removeKnowledgeDoc,
  updateKnowledgeDoc,
} from "@/adapters/knowledge-base/supabase-knowledge-store";

beforeEach(() => vi.clearAllMocks());

describe("Knowledge Base store error boundaries", () => {
  it("propagates list failures instead of returning a fake empty collection", async () => {
    const terminal = vi.fn().mockResolvedValue({ data: null, error: { message: "read failed" } });
    const query = {
      eq: vi.fn(),
      order: vi.fn(),
    };
    query.eq.mockReturnValue(query);
    query.order.mockReturnValueOnce(query).mockImplementationOnce(terminal);
    getMainSupabase.mockReturnValue({ from: () => ({ select: () => query }) });

    await expect(listKnowledgeDocs()).rejects.toThrow("read failed");
  });

  it("does not reindex a missing document and propagates version lookup failures", async () => {
    const previous = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { version: 2 }, error: null }),
    };
    previous.select.mockReturnValue(previous);
    previous.eq.mockReturnValue(previous);
    const update = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    update.update.mockReturnValue(update);
    update.eq.mockReturnValue(update);
    update.select.mockReturnValue(update);
    getMainSupabase.mockReturnValue({ from: vi.fn().mockReturnValueOnce(previous).mockReturnValueOnce(update) });

    await expect(updateKnowledgeDoc("missing", { title: "Guide" })).resolves.toBeNull();
    expect(indexDocs).not.toHaveBeenCalled();

    previous.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "version failed" } });
    getMainSupabase.mockReturnValueOnce({ from: () => previous });
    await expect(updateKnowledgeDoc("doc-1", { title: "Guide" })).rejects.toThrow("version failed");
  });

  it("distinguishes missing rows from lookup failures before delete", async () => {
    const lookup = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    lookup.select.mockReturnValue(lookup);
    lookup.eq.mockReturnValue(lookup);
    getMainSupabase.mockReturnValue({ from: () => lookup });

    await expect(removeKnowledgeDoc("missing")).resolves.toBe("not-found");

    lookup.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "lookup failed" } });
    await expect(removeKnowledgeDoc("doc-1")).rejects.toThrow("lookup failed");
  });

  it("propagates access-list failures", async () => {
    getMainSupabase.mockReturnValue({
      from: () => ({ select: vi.fn().mockResolvedValue({ data: null, error: { message: "access failed" } }) }),
    });

    await expect(listAgentAccess()).rejects.toThrow("access failed");
  });

  it("keeps Agent context access reads at the Supabase store boundary", async () => {
    const access = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { max_level: 3 }, error: null }),
    };
    access.select.mockReturnValue(access);
    access.eq.mockReturnValue(access);
    getMainSupabase.mockReturnValue({ from: () => access });

    await expect(getAgentMaxLevel("visit")).resolves.toBe(3);
    expect(access.eq).toHaveBeenCalledWith("agent_slug", "visit");
  });

  it("keeps citation audit best-effort without blocking context callers", async () => {
    const insert = vi.fn().mockRejectedValue(new Error("audit unavailable"));
    getMainSupabase.mockReturnValue({ from: () => ({ insert }) });

    await expect(
      citeKnowledge({ docId: "doc-1", agentSlug: "visit", question: "What is this?", runId: "run-1" }),
    ).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledWith({
      doc_id: "doc-1",
      agent_slug: "visit",
      question: "What is this?",
      run_id: "run-1",
    });
  });
});
