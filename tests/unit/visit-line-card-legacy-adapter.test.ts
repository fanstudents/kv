import { describe, expect, it, vi } from "vitest";

const { getMainSupabase } = vi.hoisted(() => ({ getMainSupabase: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createLegacyVisitLineCardAdapter } from "@/adapters/visit/legacy-line-adapters";

describe("legacy Visit LINE card adapter", () => {
  it("keeps the exact contacts and visit_offers insert projections", async () => {
    const contactQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "contact-1" }, error: null }),
    };
    const offerQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "offer-1" }, error: null }),
    };
    getMainSupabase.mockReturnValue({
      from: vi.fn((table: string) => (table === "contacts" ? contactQuery : offerQuery)),
    });
    const adapter = createLegacyVisitLineCardAdapter();

    await expect(
      adapter.createContact(
        { name: "Dennis", company: "CabLate", title: "CEO", email: "dennis@example.test", phone: "" },
        "line-1"
      )
    ).resolves.toEqual({ id: "contact-1" });
    await expect(adapter.createOffer("line-1", "contact-1")).resolves.toEqual({ id: "offer-1" });

    expect(contactQuery.insert).toHaveBeenCalledWith({
      name: "Dennis",
      company: "CabLate",
      title: "CEO",
      email: "dennis@example.test",
      phone: null,
      source: "line_card",
      line_user_id: "line-1",
    });
    expect(offerQuery.insert).toHaveBeenCalledWith({
      line_user_id: "line-1",
      contact_id: "contact-1",
      status: "pending",
    });
  });
});
