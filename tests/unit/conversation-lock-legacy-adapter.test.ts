import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const lockFns = vi.hoisted(() => ({
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
}));
const getSupabase = vi.hoisted(() => vi.fn(() => ({ id: "supabase-client" })));

vi.mock("@/lib/conversation-lock", () => lockFns);
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyConversationLockAdapter } from "@/adapters/conversation/legacy-lock-adapter";

describe("legacy conversation lock adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes acquisition arguments to the legacy lock helper", async () => {
    lockFns.acquireLock.mockResolvedValue({ ok: true });
    const adapter = createLegacyConversationLockAdapter();
    const options = { ttlMinutes: 9, context: { stage: "card_review" } };

    await expect(adapter.acquire("line-1", "visit", options)).resolves.toEqual({ ok: true });

    expect(getSupabase).toHaveBeenCalledOnce();
    expect(lockFns.acquireLock).toHaveBeenCalledWith({ id: "supabase-client" }, "line-1", "visit", options);
  });

  it("passes release arguments and keeps the lazy client binding", async () => {
    lockFns.releaseLock.mockResolvedValue(undefined);
    const adapter = createLegacyConversationLockAdapter();

    await adapter.release("line-1", "visit");
    await adapter.release("line-2", "visit");

    expect(getSupabase).toHaveBeenCalledOnce();
    expect(lockFns.releaseLock).toHaveBeenNthCalledWith(1, { id: "supabase-client" }, "line-1", "visit");
    expect(lockFns.releaseLock).toHaveBeenNthCalledWith(2, { id: "supabase-client" }, "line-2", "visit");
  });
});
