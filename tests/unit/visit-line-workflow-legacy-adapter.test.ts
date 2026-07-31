import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const query = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
  };
  Object.values(query).forEach((fn) => fn.mockReturnValue(query));
  return query;
});
const from = vi.hoisted(() => vi.fn(() => query));
const getSupabase = vi.hoisted(() => vi.fn(() => ({ from })));

vi.mock("@/lib/supabase", () => ({ getSupabase }));

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
});
