import { beforeEach, describe, expect, it, vi } from "vitest";


const query = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    lt: vi.fn(),
    gt: vi.fn(),
    is: vi.fn(),
    not: vi.fn(),
    neq: vi.fn(),
    maybeSingle: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
  };
  Object.values(query).forEach((fn) => fn.mockReturnValue(query));
  return query;
});
const from = vi.hoisted(() => vi.fn(() => query));
const getMainSupabase = vi.hoisted(() => vi.fn(() => ({ from })));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createLegacyVisitLineWorkflowAdapter } from "@/adapters/visit/legacy-line-workflow-adapter";

describe("legacy Visit LINE workflow persistence adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("projects the pending offer and joined contact without changing the query", async () => {
    query.maybeSingle.mockResolvedValue({
      data: {
        id: "offer-1",
        contacts: { id: "contact-1", name: "Alice", email: "alice@example.com" },
      },
    });
    const adapter = createLegacyVisitLineWorkflowAdapter();

    await expect(adapter.findPendingOffer("line-1")).resolves.toEqual({
      id: "offer-1",
      contact: { id: "contact-1", name: "Alice", email: "alice@example.com" },
    });

    expect(from).toHaveBeenCalledWith("visit_offers");
    expect(query.select).toHaveBeenCalledWith("*, contacts(id, name, title, company, email, phone)");
    expect(query.eq).toHaveBeenNthCalledWith(1, "line_user_id", "line-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "status", "pending");
  });

  it("keeps legacy offer resolution and dynamic contact correction writes", async () => {
    const adapter = createLegacyVisitLineWorkflowAdapter();

    await adapter.resolveOffer("offer-1", "declined", "2026-07-31T00:00:00.000Z");
    await adapter.updateContactField("contact-1", "company", "Acme");

    expect(query.update).toHaveBeenNthCalledWith(1, { status: "declined", resolved_at: "2026-07-31T00:00:00.000Z" });
    expect(query.update).toHaveBeenNthCalledWith(2, { company: "Acme" });
  });

  it("keeps the stale-offer query and maps joined contact names", async () => {
    query.limit.mockReturnValueOnce({
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: [
            {
              id: "offer-1",
              line_user_id: "line-1",
              contact_id: "contact-1",
              timeout_phase: null,
              contacts: { name: "Alice" },
            },
            {
              id: "offer-2",
              line_user_id: null,
              contact_id: null,
              timeout_phase: null,
              contacts: null,
            },
          ],
        }).then(resolve),
    });
    const adapter = createLegacyVisitLineWorkflowAdapter();

    await expect(
      adapter.findStaleOffers({
        olderThan: "2026-07-31T11:57:00.000Z",
        notOlderThan: "2026-07-31T11:40:00.000Z",
        limit: 20,
      })
    ).resolves.toEqual([
      { id: "offer-1", lineUserId: "line-1", contactId: "contact-1", contactName: "Alice", timeoutPhase: null },
      { id: "offer-2", lineUserId: null, contactId: null, contactName: null, timeoutPhase: null },
    ]);

    expect(from).toHaveBeenCalledWith("visit_offers");
    expect(query.select).toHaveBeenCalledWith("id, line_user_id, contact_id, timeout_phase, contacts(name)");
    expect(query.eq).toHaveBeenCalledWith("status", "pending");
    expect(query.is).toHaveBeenCalledWith("timeout_phase", null);
    expect(query.lt).toHaveBeenCalledWith("created_at", "2026-07-31T11:57:00.000Z");
    expect(query.gt).toHaveBeenCalledWith("created_at", "2026-07-31T11:40:00.000Z");
    expect(query.limit).toHaveBeenCalledWith(20);
  });

  it("writes timeout checkpoints and keeps the last error bounded", async () => {
    const adapter = createLegacyVisitLineWorkflowAdapter();

    await adapter.resolveOffer("offer-1", "timed_out", "2026-07-31T00:00:00.000Z");
    await adapter.markTimeoutPhase("offer-1", "line_notified");
    await adapter.recordTimeoutError("offer-1", "provider unavailable");

    expect(query.update).toHaveBeenNthCalledWith(1, {
      status: "declined",
      resolved_at: "2026-07-31T00:00:00.000Z",
      timeout_phase: "resolved",
      timeout_error: null,
    });
    expect(query.update).toHaveBeenNthCalledWith(2, { timeout_phase: "line_notified", timeout_error: null });
    expect(query.update).toHaveBeenNthCalledWith(3, { timeout_error: "provider unavailable" });
  });

  it("maps prepared invites through the unchanged legacy row shape", async () => {
    query.single.mockResolvedValue({ data: { id: "invite-1" } });
    const adapter = createLegacyVisitLineWorkflowAdapter();
    const invite = {
      contactId: "contact-1",
      toEmail: "alice@example.com",
      subject: "拜訪邀請",
      body: "您好",
      slots: [
        { label: "週一 10:00", start: "2026-08-03T10:00:00.000Z", end: "2026-08-03T11:00:00.000Z" },
        { label: "週二 14:00", start: "2026-08-04T14:00:00.000Z", end: "2026-08-04T15:00:00.000Z" },
      ] as const,
      requiresApproval: true,
    };

    await expect(adapter.createPendingInvite("line-1", invite)).resolves.toEqual({ id: "invite-1" });

    expect(from).toHaveBeenCalledWith("pending_invites");
    expect(query.insert).toHaveBeenCalledWith({
      line_user_id: "line-1",
      contact_id: "contact-1",
      to_email: "alice@example.com",
      subject: "拜訪邀請",
      body: "您好",
      slot1: "週一 10:00",
      slot2: "週二 14:00",
      slot1_start: "2026-08-03T10:00:00.000Z",
      slot1_end: "2026-08-03T11:00:00.000Z",
      slot2_start: "2026-08-04T14:00:00.000Z",
      slot2_end: "2026-08-04T15:00:00.000Z",
      status: "awaiting_approval",
    });
  });

  it("fails explicitly when Supabase cannot return the inserted invite", async () => {
    query.single.mockResolvedValue({ data: null, error: { message: "insert failed" } });
    const adapter = createLegacyVisitLineWorkflowAdapter();
    const invite = {
      contactId: "contact-1",
      toEmail: "alice@example.com",
      subject: "拜訪邀請",
      body: "您好",
      slots: [
        { label: "週一 10:00", start: "2026-08-03T10:00:00.000Z", end: "2026-08-03T11:00:00.000Z" },
        { label: "週二 14:00", start: "2026-08-04T14:00:00.000Z", end: "2026-08-04T15:00:00.000Z" },
      ] as const,
      requiresApproval: true,
    };

    await expect(adapter.createPendingInvite("line-1", invite)).rejects.toThrow("insert failed");
  });

  it("does not turn workflow database failures into missing records or successful writes", async () => {
    const adapter = createLegacyVisitLineWorkflowAdapter();
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "read unavailable" } });
    await expect(adapter.findPendingOffer("line-1")).rejects.toThrow(
      "Visit pending offer read failed: read unavailable"
    );

    query.eq.mockResolvedValueOnce({ error: { message: "write unavailable" } });
    await expect(
      adapter.resolveOffer("offer-1", "declined", "2026-07-31T00:00:00.000Z")
    ).rejects.toThrow("Visit offer resolution failed: write unavailable");
  });
});
