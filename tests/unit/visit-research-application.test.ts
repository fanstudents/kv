import { describe, expect, it, vi } from "vitest";
import {
  parseVisitResearchRequest,
  runVisitContactResearch,
  runVisitResearch,
  runVisitResearchRead,
  type VisitContactProfile,
  type VisitResearchDependencies,
  type VisitResearchInput,
} from "@/modules/visit/research";

const input: VisitResearchInput = {
  contactId: "contact-1",
  inviteId: "invite-1",
  name: "Typed Name",
  company: "Typed Co",
  title: null,
  email: null,
};

const profile: VisitContactProfile = {
  companySummary: "Company summary",
  personSummary: "Person summary",
  links: [{ label: "Official", url: "https://example.test" }],
  highlights: ["Highlight"],
  talkingPoints: ["Talk"],
  sources: ["https://example.test/source"],
  confidence: 0.8,
};

function createDependencies(
  overrides: Partial<VisitResearchDependencies> = {}
): VisitResearchDependencies {
  return {
    repository: {
      findContact: vi.fn(async () => ({
        name: "DB Name",
        company: "DB Co",
        title: "CEO",
        email: "db@example.test",
      })),
      findRecentCompletedProfile: vi.fn(async () => null),
      storeProfile: vi.fn(async () => "profile-1"),
      storeFailure: vi.fn(async () => undefined),
      listProfiles: vi.fn(async () => [{
        id: "profile-1",
        person_name: "DB Name",
        company: "DB Co",
        company_summary: "Company summary",
        person_summary: "Person summary",
        links: [],
        highlights: [],
        talking_points: [],
        sources: [],
        confidence: 0.8,
        status: "done",
        created_at: "2026-08-02T00:00:00.000Z",
      }]),
      recordActivity: vi.fn(async () => undefined),
    },
    provider: {
      buildSearchInput: vi.fn(() => "search input"),
      search: vi.fn(async () => profile),
    },
    runs: {
      start: vi.fn(async () => "run-1"),
      step: vi.fn(async () => undefined),
      finish: vi.fn(async () => undefined),
    },
    now: () => Date.parse("2026-08-02T00:00:00.000Z"),
    ...overrides,
  };
}

describe("Visit research application", () => {
  it("keeps the existing request parsing contract", () => {
    expect(parseVisitResearchRequest({
      contactId: "contact-1",
      name: "  Dennis  ",
      company: "  CabLate  ",
      title: "ignored",
      email: "ignored@example.test",
    })).toEqual({
      contactId: "contact-1",
      name: "Dennis",
      company: "CabLate",
      title: null,
      email: null,
    });
  });

  it("reads the existing ten-profile projection", async () => {
    const dependencies = createDependencies();

    await expect(runVisitResearchRead(dependencies.repository)).resolves.toEqual({
      profiles: [expect.objectContaining({ id: "profile-1" })],
    });
    expect(dependencies.repository.listProfiles).toHaveBeenCalledWith(10);
  });

  it("uses the contact row as source of truth and owns the complete success sequence", async () => {
    const dependencies = createDependencies();

    await expect(runVisitResearch(input, dependencies)).resolves.toEqual({
      kind: "ok",
      data: { id: "profile-1", profiles: [expect.objectContaining({ id: "profile-1" })] },
    });

    expect(dependencies.repository.findContact).toHaveBeenCalledWith("contact-1");
    expect(dependencies.repository.findRecentCompletedProfile).toHaveBeenCalledWith(
      "contact-1",
      "2026-07-03T00:00:00.000Z"
    );
    expect(dependencies.runs.start).toHaveBeenCalledWith({
      triggerRef: "research:invite-1",
      summary: "拜訪前背景調查：DB Name",
      meta: { contactId: "contact-1", company: "DB Co" },
    });
    expect(dependencies.provider.buildSearchInput).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "DB Name",
        company: "DB Co",
        title: "CEO",
        email: "db@example.test",
      })
    );
    expect(dependencies.repository.storeProfile).toHaveBeenCalledWith({
      input: expect.objectContaining({ name: "DB Name", company: "DB Co" }),
      profile,
      status: "done",
      runId: "run-1",
    });
    expect(dependencies.runs.finish).toHaveBeenCalledWith("run-1", {
      status: "success",
      summary: "已完成 DB Name 的行前背景調查",
    });
    expect(dependencies.repository.recordActivity).toHaveBeenCalledWith({
      summary: "已完成拜訪前背景調查：DB Name（DB Co）——1 個公開連結、1 則近況",
      status: "success",
    });
  });

  it("returns the 30-day completed profile without starting a provider run", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.repository.findRecentCompletedProfile).mockResolvedValue("recent-profile");

    await expect(runVisitContactResearch(input, dependencies)).resolves.toBe("recent-profile");

    expect(dependencies.repository.findRecentCompletedProfile).toHaveBeenCalledWith(
      "contact-1",
      "2026-07-03T00:00:00.000Z"
    );
    expect(dependencies.runs.start).not.toHaveBeenCalled();
    expect(dependencies.provider.search).not.toHaveBeenCalled();
    expect(dependencies.repository.storeProfile).not.toHaveBeenCalled();
  });

  it("stores an empty result and keeps its pending activity outcome", async () => {
    const dependencies = createDependencies();
    const emptyProfile: VisitContactProfile = {
      companySummary: "",
      personSummary: "",
      links: [],
      highlights: [],
      talkingPoints: ["ignored for found decision"],
      sources: [],
      confidence: 0.4,
    };
    vi.mocked(dependencies.provider.search).mockResolvedValue(emptyProfile);

    await expect(runVisitContactResearch(input, dependencies)).resolves.toBe("profile-1");

    expect(dependencies.repository.storeProfile).toHaveBeenCalledWith({
      input,
      profile: emptyProfile,
      status: "empty",
      runId: "run-1",
    });
    expect(dependencies.repository.recordActivity).toHaveBeenCalledWith({
      summary: "拜訪前背景調查：Typed Name 沒有查到可靠的公開資料",
      status: "pending",
    });
  });

  it("records provider failure and suppresses compensation-write failure", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.provider.search).mockRejectedValue(new Error("provider unavailable"));
    vi.mocked(dependencies.repository.storeFailure).mockRejectedValue(new Error("db unavailable"));

    await expect(runVisitContactResearch(input, dependencies)).resolves.toBeNull();

    expect(dependencies.runs.finish).toHaveBeenCalledWith("run-1", {
      status: "failed",
      errorKind: "external",
      errorDetail: "provider unavailable",
    });
    expect(dependencies.repository.storeFailure).toHaveBeenCalledWith({
      input,
      errorDetail: "provider unavailable",
      runId: "run-1",
    });
  });

  it("keeps missing-name and failed-research API outcomes", async () => {
    const missing = createDependencies();
    vi.mocked(missing.repository.findContact).mockResolvedValue(null);
    await expect(runVisitResearch({ ...input, name: "" }, missing)).resolves.toEqual({
      kind: "invalid",
      message: "缺少要調查的對象姓名",
    });

    const failed = createDependencies();
    vi.mocked(failed.provider.search).mockRejectedValue(new Error("provider unavailable"));
    await expect(runVisitResearch({ ...input, contactId: null }, failed)).resolves.toEqual({
      kind: "error",
      message: "調查失敗，請稍後再試",
    });
  });
});
