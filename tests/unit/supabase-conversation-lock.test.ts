import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getSupabase = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createSupabaseConversationLock } from "@/adapters/conversation/supabase-conversation-lock";

function createClient(existing: { owner_agent_slug: string; expires_at: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: existing });
  const selectEq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: selectEq }));
  const upsert = vi.fn().mockResolvedValue({ error: null });

  const releaseOwnerEq = vi.fn().mockResolvedValue({ error: null });
  const releaseUserEq = vi.fn(() => ({ eq: releaseOwnerEq }));
  const remove = vi.fn(() => ({ eq: releaseUserEq }));

  const query = { select, upsert, delete: remove };
  const from = vi.fn(() => query);

  return {
    client: { from },
    from,
    maybeSingle,
    upsert,
    remove,
    releaseUserEq,
    releaseOwnerEq,
  };
}

describe("Supabase conversation lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a missing lock with the existing 15-minute default", async () => {
    const db = createClient(null);
    getSupabase.mockReturnValue(db.client);
    const lock = createSupabaseConversationLock();

    await expect(lock.acquire("line-1", "visit")).resolves.toEqual({ ok: true });

    expect(db.upsert).toHaveBeenCalledWith({
      line_user_id: "line-1",
      owner_agent_slug: "visit",
      context: {},
      expires_at: "2026-08-02T00:15:00.000Z",
    });
  });

  it("rejects another owner while its lock is still active", async () => {
    const db = createClient({
      owner_agent_slug: "support",
      expires_at: "2026-08-02T00:01:00.000Z",
    });
    getSupabase.mockReturnValue(db.client);

    await expect(
      createSupabaseConversationLock().acquire("line-1", "visit")
    ).resolves.toEqual({ ok: false, heldBy: "support" });
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("replaces an expired lock owned by another agent", async () => {
    const db = createClient({
      owner_agent_slug: "support",
      expires_at: "2026-08-01T23:59:59.000Z",
    });
    getSupabase.mockReturnValue(db.client);

    await expect(
      createSupabaseConversationLock().acquire("line-1", "visit")
    ).resolves.toEqual({ ok: true });
    expect(db.upsert).toHaveBeenCalledOnce();
  });

  it("renews the same owner's lock with custom TTL and context", async () => {
    const db = createClient({
      owner_agent_slug: "visit",
      expires_at: "2026-08-02T00:01:00.000Z",
    });
    getSupabase.mockReturnValue(db.client);

    await expect(
      createSupabaseConversationLock().acquire("line-1", "visit", {
        ttlMinutes: 9,
        context: { stage: "card_review" },
      })
    ).resolves.toEqual({ ok: true });
    expect(db.upsert).toHaveBeenCalledWith({
      line_user_id: "line-1",
      owner_agent_slug: "visit",
      context: { stage: "card_review" },
      expires_at: "2026-08-02T00:09:00.000Z",
    });
  });

  it("releases only the requested owner's lock and reuses the lazy client", async () => {
    const db = createClient(null);
    getSupabase.mockReturnValue(db.client);
    const lock = createSupabaseConversationLock();

    await lock.release("line-1", "visit");
    await lock.release("line-2", "visit");

    expect(getSupabase).toHaveBeenCalledOnce();
    expect(db.releaseUserEq).toHaveBeenNthCalledWith(1, "line_user_id", "line-1");
    expect(db.releaseUserEq).toHaveBeenNthCalledWith(2, "line_user_id", "line-2");
    expect(db.releaseOwnerEq).toHaveBeenNthCalledWith(1, "owner_agent_slug", "visit");
    expect(db.releaseOwnerEq).toHaveBeenNthCalledWith(2, "owner_agent_slug", "visit");
  });
});
