import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getMainSupabase = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createSupabaseConversationLock } from "@/adapters/conversation/supabase-conversation-lock";

type LockRow = { owner_agent_slug: string; expires_at: string };
type DatabaseError = { code?: string; message: string };

function createClient(options: {
  reads?: Array<{ data: LockRow | null; error: DatabaseError | null }>;
  compareAndSwap?: { data: { owner_agent_slug: string } | null; error: DatabaseError | null };
  insertError?: DatabaseError | null;
  releaseError?: DatabaseError | null;
} = {}) {
  const readResults = options.reads ?? [{ data: null, error: null }];
  const readMaybeSingle = vi.fn();
  for (const result of readResults) readMaybeSingle.mockResolvedValueOnce(result);
  readMaybeSingle.mockResolvedValue(readResults.at(-1));
  const readQuery = { eq: vi.fn(), maybeSingle: readMaybeSingle };
  readQuery.eq.mockReturnValue(readQuery);
  const select = vi.fn(() => readQuery);

  const compareAndSwapMaybeSingle = vi.fn().mockResolvedValue(
    options.compareAndSwap ?? { data: { owner_agent_slug: "visit" }, error: null },
  );
  const compareAndSwapQuery = {
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: compareAndSwapMaybeSingle,
  };
  compareAndSwapQuery.eq.mockReturnValue(compareAndSwapQuery);
  compareAndSwapQuery.select.mockReturnValue(compareAndSwapQuery);
  const update = vi.fn(() => compareAndSwapQuery);

  const insert = vi.fn().mockResolvedValue({ error: options.insertError ?? null });
  const releaseOwnerEq = vi.fn().mockResolvedValue({ error: options.releaseError ?? null });
  const releaseUserEq = vi.fn(() => ({ eq: releaseOwnerEq }));
  const remove = vi.fn(() => ({ eq: releaseUserEq }));
  const from = vi.fn(() => ({ select, update, insert, delete: remove }));

  return {
    client: { from },
    readMaybeSingle,
    update,
    compareAndSwapQuery,
    compareAndSwapMaybeSingle,
    insert,
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
    const db = createClient();
    getMainSupabase.mockReturnValue(db.client);

    await expect(createSupabaseConversationLock().acquire("line-1", "visit")).resolves.toEqual({ ok: true });

    expect(db.insert).toHaveBeenCalledWith({
      line_user_id: "line-1",
      owner_agent_slug: "visit",
      context: {},
      expires_at: "2026-08-02T00:15:00.000Z",
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects another owner while its lock is still active", async () => {
    const db = createClient({
      reads: [{ data: { owner_agent_slug: "support", expires_at: "2026-08-02T00:01:00.000Z" }, error: null }],
    });
    getMainSupabase.mockReturnValue(db.client);

    await expect(createSupabaseConversationLock().acquire("line-1", "visit"))
      .resolves.toEqual({ ok: false, heldBy: "support" });
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("replaces an expired lock with a compare-and-swap on the observed owner and expiry", async () => {
    const expired = { owner_agent_slug: "support", expires_at: "2026-08-01T23:59:59.000Z" };
    const db = createClient({ reads: [{ data: expired, error: null }] });
    getMainSupabase.mockReturnValue(db.client);

    await expect(createSupabaseConversationLock().acquire("line-1", "visit"))
      .resolves.toEqual({ ok: true });

    expect(db.update).toHaveBeenCalledWith({
      line_user_id: "line-1",
      owner_agent_slug: "visit",
      context: {},
      expires_at: "2026-08-02T00:15:00.000Z",
    });
    expect(db.compareAndSwapQuery.eq).toHaveBeenNthCalledWith(1, "line_user_id", "line-1");
    expect(db.compareAndSwapQuery.eq).toHaveBeenNthCalledWith(2, "owner_agent_slug", "support");
    expect(db.compareAndSwapQuery.eq).toHaveBeenNthCalledWith(3, "expires_at", expired.expires_at);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("treats a concurrent same-owner acquisition as success and another winner as held", async () => {
    const expired = { owner_agent_slug: "support", expires_at: "2026-08-01T23:59:59.000Z" };
    const sameOwner = createClient({
      reads: [
        { data: expired, error: null },
        { data: { owner_agent_slug: "visit", expires_at: "2026-08-02T00:15:00.000Z" }, error: null },
      ],
      compareAndSwap: { data: null, error: null },
    });
    getMainSupabase.mockReturnValueOnce(sameOwner.client);
    await expect(createSupabaseConversationLock().acquire("line-1", "visit"))
      .resolves.toEqual({ ok: true });

    const otherOwner = createClient({
      reads: [
        { data: null, error: null },
        { data: { owner_agent_slug: "orders", expires_at: "2026-08-02T00:15:00.000Z" }, error: null },
      ],
      insertError: { code: "23505", message: "duplicate key" },
    });
    getMainSupabase.mockReturnValueOnce(otherOwner.client);
    await expect(createSupabaseConversationLock().acquire("line-2", "visit"))
      .resolves.toEqual({ ok: false, heldBy: "orders" });
  });

  it("renews the same owner's lock with custom TTL and context", async () => {
    const db = createClient({
      reads: [{ data: { owner_agent_slug: "visit", expires_at: "2026-08-02T00:01:00.000Z" }, error: null }],
    });
    getMainSupabase.mockReturnValue(db.client);

    await expect(createSupabaseConversationLock().acquire("line-1", "visit", {
      ttlMinutes: 9,
      context: { stage: "card_review" },
    })).resolves.toEqual({ ok: true });
    expect(db.update).toHaveBeenCalledWith({
      line_user_id: "line-1",
      owner_agent_slug: "visit",
      context: { stage: "card_review" },
      expires_at: "2026-08-02T00:09:00.000Z",
    });
  });

  it("fails closed on read, write, and release database errors", async () => {
    const readFailure = createClient({ reads: [{ data: null, error: { message: "read unavailable" } }] });
    getMainSupabase.mockReturnValueOnce(readFailure.client);
    await expect(createSupabaseConversationLock().acquire("line-1", "visit"))
      .rejects.toMatchObject({ name: "ConversationLockRepositoryError", message: expect.stringContaining("read unavailable") });

    const writeFailure = createClient({ insertError: { message: "write unavailable" } });
    getMainSupabase.mockReturnValueOnce(writeFailure.client);
    await expect(createSupabaseConversationLock().acquire("line-2", "visit"))
      .rejects.toMatchObject({ name: "ConversationLockRepositoryError", message: expect.stringContaining("write unavailable") });

    const releaseFailure = createClient({ releaseError: { message: "release unavailable" } });
    getMainSupabase.mockReturnValueOnce(releaseFailure.client);
    await expect(createSupabaseConversationLock().release("line-3", "visit"))
      .rejects.toMatchObject({ name: "ConversationLockRepositoryError", message: expect.stringContaining("release unavailable") });
  });

  it("releases only the requested owner's lock and reuses the lazy client", async () => {
    const db = createClient();
    getMainSupabase.mockReturnValue(db.client);
    const lock = createSupabaseConversationLock();

    await lock.release("line-1", "visit");
    await lock.release("line-2", "visit");

    expect(getMainSupabase).toHaveBeenCalledOnce();
    expect(db.releaseUserEq).toHaveBeenNthCalledWith(1, "line_user_id", "line-1");
    expect(db.releaseUserEq).toHaveBeenNthCalledWith(2, "line_user_id", "line-2");
    expect(db.releaseOwnerEq).toHaveBeenNthCalledWith(1, "owner_agent_slug", "visit");
    expect(db.releaseOwnerEq).toHaveBeenNthCalledWith(2, "owner_agent_slug", "visit");
  });

  it("rejects non-JSON context before reading or writing a lock", async () => {
    const db = createClient();
    getMainSupabase.mockReturnValue(db.client);

    await expect(createSupabaseConversationLock().acquire("line-1", "visit", {
      context: { startedAt: new Date() },
    })).rejects.toThrow("Conversation lock context must be JSON serializable");
    expect(db.readMaybeSingle).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
