import { describe, expect, it, vi } from "vitest";

const { listContactProfiles, researchContact, getSupabase } = vi.hoisted(() => ({
  listContactProfiles: vi.fn(),
  researchContact: vi.fn(),
  getSupabase: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/contact-research", () => ({ listContactProfiles, researchContact }));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyVisitResearchAdapter } from "@/adapters/visit/legacy-research-adapter";

describe("legacy Visit research adapter", () => {
  it("keeps the contacts projection and delegates research/profile reads", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: "Dennis", company: "TBR", title: "CEO", email: "d@example.test" } }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    getSupabase.mockReturnValue({ from: vi.fn(() => query) });
    researchContact.mockResolvedValue("profile-1");
    listContactProfiles.mockResolvedValue([{ id: "profile-1" }]);
    const adapter = createLegacyVisitResearchAdapter();

    await expect(adapter.findContact("c1")).resolves.toEqual({ name: "Dennis", company: "TBR", title: "CEO", email: "d@example.test" });
    await expect(adapter.research({ contactId: "c1", name: "Dennis", company: "TBR", title: "CEO", email: "d@example.test" })).resolves.toBe("profile-1");
    await expect(adapter.listProfiles(10)).resolves.toEqual([{ id: "profile-1" }]);
    expect(query.select).toHaveBeenCalledWith("name,company,title,email");
    expect(query.eq).toHaveBeenCalledWith("id", "c1");
    expect(researchContact).toHaveBeenCalledOnce();
    expect(listContactProfiles).toHaveBeenCalledWith(10);
  });
});
