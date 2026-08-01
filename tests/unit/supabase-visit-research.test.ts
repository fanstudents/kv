import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getMainSupabase = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createSupabaseVisitResearchRepository } from "@/adapters/visit/supabase-visit-research";

function createClient() {
  const contactSingle = vi.fn().mockResolvedValue({
    data: { name: "Dennis", company: "CabLate", title: "Founder", email: "d@example.test" },
  });
  const contactEq = vi.fn(() => ({ maybeSingle: contactSingle }));
  const contactSelect = vi.fn(() => ({ eq: contactEq }));

  const recentSingle = vi.fn().mockResolvedValue({ data: { id: "recent-1" } });
  const recentGte = vi.fn(() => ({ maybeSingle: recentSingle }));
  const recentStatusEq = vi.fn(() => ({ gte: recentGte }));
  const recentContactEq = vi.fn(() => ({ eq: recentStatusEq }));
  const storedSingle = vi.fn().mockResolvedValue({ data: { id: "profile-1" }, error: null });
  const storedSelect = vi.fn(() => ({ single: storedSingle }));
  const profileInsert = vi.fn(() => ({ select: storedSelect }));

  const storedProfile = {
    id: "profile-1",
    person_name: "Dennis",
    company: "CabLate",
    company_summary: "Company",
    person_summary: "Person",
    links: [{ label: "官網", url: "https://example.test", kind: "website" }],
    highlights: ["News"],
    talking_points: ["Topic"],
    sources: ["https://example.test"],
    confidence: 0.8,
    status: "done",
    created_at: "2026-08-02T00:00:00.000Z",
  };
  const profileListLimit = vi.fn().mockResolvedValue({ data: [storedProfile] });
  const profileListOrder = vi.fn(() => ({ limit: profileListLimit }));
  const activityInsert = vi.fn().mockResolvedValue({ error: null });
  let profileSelectCall = 0;
  const profileTable = {
    select: vi.fn((columns: string) => {
      profileSelectCall += 1;
      if (columns === "id" && profileSelectCall === 1) return { eq: recentContactEq };
      return { order: profileListOrder };
    }),
    insert: profileInsert,
  };
  const from = vi.fn((table: string) => {
    if (table === "contacts") return { select: contactSelect };
    if (table === "contact_profiles") return profileTable;
    if (table === "line_agent_activity") return { insert: activityInsert };
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    client: { from },
    from,
    contactSelect,
    contactEq,
    recentContactEq,
    recentStatusEq,
    recentGte,
    profileInsert,
    profileListLimit,
    activityInsert,
  };
}

describe("Supabase Visit research repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps contacts, recent-profile lookup, profile storage, list, and activity", async () => {
    const db = createClient();
    getMainSupabase.mockReturnValue(db.client);
    const repository = createSupabaseVisitResearchRepository();

    await expect(repository.findContact("contact-1")).resolves.toEqual({
      name: "Dennis",
      company: "CabLate",
      title: "Founder",
      email: "d@example.test",
    });
    await expect(repository.findRecentCompletedProfile(
      "contact-1",
      "2026-07-03T00:00:00.000Z"
    )).resolves.toBe("recent-1");
    await expect(repository.storeProfile({
      input: {
        contactId: "contact-1",
        inviteId: "invite-1",
        name: "Dennis",
        company: "CabLate",
        title: "Founder",
        email: "d@example.test",
      },
      profile: {
        companySummary: "Company",
        personSummary: "Person",
        links: [{ label: "官網", url: "https://example.test", kind: "website" }],
        highlights: [],
        talkingPoints: [],
        sources: [],
        confidence: 0.8,
      },
      status: "done",
      runId: "run-1",
    })).resolves.toBe("profile-1");
    await repository.storeFailure({
      input: {
        contactId: "contact-1",
        inviteId: "invite-1",
        name: "Dennis",
        company: "CabLate",
        title: "Founder",
        email: "d@example.test",
      },
      errorDetail: "provider unavailable",
      runId: "run-1",
    });
    await expect(repository.listProfiles(10)).resolves.toEqual([{
      id: "profile-1",
      person_name: "Dennis",
      company: "CabLate",
      company_summary: "Company",
      person_summary: "Person",
      links: [{ label: "官網", url: "https://example.test", kind: "website" }],
      highlights: ["News"],
      talking_points: ["Topic"],
      sources: ["https://example.test"],
      confidence: 0.8,
      status: "done",
      created_at: "2026-08-02T00:00:00.000Z",
    }]);
    await repository.recordActivity({ summary: "done", status: "success" });

    expect(db.contactSelect).toHaveBeenCalledWith("name,company,title,email");
    expect(db.contactEq).toHaveBeenCalledWith("id", "contact-1");
    expect(db.recentContactEq).toHaveBeenCalledWith("contact_id", "contact-1");
    expect(db.recentStatusEq).toHaveBeenCalledWith("status", "done");
    expect(db.recentGte).toHaveBeenCalledWith("created_at", "2026-07-03T00:00:00.000Z");
    expect(db.profileInsert).toHaveBeenCalledWith(expect.objectContaining({
      contact_id: "contact-1",
      invite_id: "invite-1",
      person_name: "Dennis",
      status: "done",
      run_id: "run-1",
      links: [{ label: "官網", url: "https://example.test", kind: "website" }],
    }));
    expect(db.profileInsert).toHaveBeenCalledWith({
      contact_id: "contact-1",
      invite_id: "invite-1",
      person_name: "Dennis",
      company: "CabLate",
      status: "failed",
      error_detail: "provider unavailable",
      run_id: "run-1",
    });
    expect(db.profileListLimit).toHaveBeenCalledWith(10);
    expect(db.activityInsert).toHaveBeenCalledWith({
      agent_slug: "visit",
      summary: "done",
      status: "success",
    });
    expect(getMainSupabase).toHaveBeenCalledOnce();
  });

  it("keeps profile-list failures as the existing empty projection", async () => {
    getMainSupabase.mockImplementation(() => {
      throw new Error("missing database");
    });

    await expect(createSupabaseVisitResearchRepository().listProfiles(10)).resolves.toEqual([]);
  });
});
