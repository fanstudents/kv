import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const legacyDependencies = { kind: "legacy-visit-ai-dependencies" };
  const researchDependencies = { repository: { kind: "visit-research-repository" } };

  return {
    legacyDependencies,
    researchDependencies,
    createLegacyVisitAiDependencies: vi.fn(() => legacyDependencies),
    createVisitResearchDependencies: vi.fn(() => researchDependencies),
    parseBusinessCardRequest: vi.fn(),
    runParseBusinessCard: vi.fn(),
    parseDraftInviteEmailRequest: vi.fn(),
    runDraftInviteEmail: vi.fn(),
    parseVisitResearchRequest: vi.fn(),
    runVisitResearch: vi.fn(),
    runVisitResearchRead: vi.fn(),
  };
});

vi.mock("@/adapters/visit/legacy-ai-dependencies", () => ({
  createLegacyVisitAiDependencies: mocks.createLegacyVisitAiDependencies,
}));
vi.mock("@/adapters/visit/visit-research-dependencies", () => ({
  createVisitResearchDependencies: mocks.createVisitResearchDependencies,
}));
vi.mock("@/modules/visit/ai", () => ({
  parseBusinessCardRequest: mocks.parseBusinessCardRequest,
  runParseBusinessCard: mocks.runParseBusinessCard,
  parseDraftInviteEmailRequest: mocks.parseDraftInviteEmailRequest,
  runDraftInviteEmail: mocks.runDraftInviteEmail,
}));
vi.mock("@/modules/visit/research", () => ({
  parseVisitResearchRequest: mocks.parseVisitResearchRequest,
  runVisitResearch: mocks.runVisitResearch,
  runVisitResearchRead: mocks.runVisitResearchRead,
}));

import { POST as postParseCard } from "@/app/api/agents/visit/parse-card/route";
import { POST as postDraftEmail } from "@/app/api/agents/visit/draft-email/route";
import { GET as getResearch, POST as postResearch } from "@/app/api/agents/visit/research/route";

function postRequest(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createLegacyVisitAiDependencies.mockReturnValue(mocks.legacyDependencies);
  mocks.parseBusinessCardRequest.mockReturnValue({ kind: "ok", imageDataUrl: "data:image/png;base64,card" });
  mocks.runParseBusinessCard.mockResolvedValue({
    kind: "ok",
    data: { name: "Dennis", company: "CabLate", title: "", email: "", phone: "" },
  });
  mocks.parseDraftInviteEmailRequest.mockReturnValue({
    kind: "ok",
    input: {
      contactName: "Dennis",
      contactTitle: "",
      company: "CabLate",
      meetingType: "喝咖啡",
      slot1: "週一 10:00",
      slot2: "週二 10:00",
      senderName: "CabLate",
    },
  });
  mocks.runDraftInviteEmail.mockResolvedValue({
    kind: "ok",
    data: { subject: "邀約", body: "內容" },
  });
  mocks.parseVisitResearchRequest.mockReturnValue({
    contactId: null,
    name: "Dennis",
    company: "CabLate",
    title: null,
    email: null,
  });
  mocks.runVisitResearch.mockResolvedValue({
    kind: "ok",
    data: { id: "profile-1", profiles: [{ id: "profile-1" }] },
  });
  mocks.runVisitResearchRead.mockResolvedValue({ profiles: [{ id: "profile-1" }] });
});

describe("Visit AI route contracts", () => {
  it("keeps the business-card success envelope", async () => {
    const response = await postParseCard(
      postRequest("/api/agents/visit/parse-card", { imageDataUrl: "data:image/png;base64,card" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      contact: { name: "Dennis", company: "CabLate", title: "", email: "", phone: "" },
    });
    expect(mocks.runParseBusinessCard).toHaveBeenCalledWith(
      "data:image/png;base64,card",
      mocks.legacyDependencies,
    );
  });

  it("rejects invalid business-card input before constructing dependencies", async () => {
    mocks.parseBusinessCardRequest.mockReturnValue({ kind: "invalid", message: "缺少有效的名片圖片" });

    const response = await postParseCard(postRequest("/api/agents/visit/parse-card", {}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "缺少有效的名片圖片" });
    expect(mocks.createLegacyVisitAiDependencies).not.toHaveBeenCalled();
    expect(mocks.runParseBusinessCard).not.toHaveBeenCalled();
  });

  it("maps a business-card provider failure to the existing 502 envelope", async () => {
    mocks.runParseBusinessCard.mockResolvedValue({ kind: "error", message: "Vision unavailable" });

    const response = await postParseCard(postRequest("/api/agents/visit/parse-card", { imageDataUrl: "data:image/png;base64,card" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Vision unavailable" });
  });

  it("keeps the draft-email success envelope", async () => {
    const response = await postDraftEmail(postRequest("/api/agents/visit/draft-email", { contactName: "Dennis" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ draft: { subject: "邀約", body: "內容" } });
    expect(mocks.runDraftInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ contactName: "Dennis", company: "CabLate" }),
      mocks.legacyDependencies,
    );
  });

  it("rejects invalid draft-email input before constructing dependencies", async () => {
    mocks.parseDraftInviteEmailRequest.mockReturnValue({ kind: "invalid", message: "缺少收件人姓名" });

    const response = await postDraftEmail(postRequest("/api/agents/visit/draft-email", {}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "缺少收件人姓名" });
    expect(mocks.createLegacyVisitAiDependencies).not.toHaveBeenCalled();
    expect(mocks.runDraftInviteEmail).not.toHaveBeenCalled();
  });

  it("maps a draft-email provider failure to the existing 502 envelope", async () => {
    mocks.runDraftInviteEmail.mockResolvedValue({ kind: "error", message: "OpenAI unavailable" });

    const response = await postDraftEmail(postRequest("/api/agents/visit/draft-email", { contactName: "Dennis" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "OpenAI unavailable" });
  });

  it("keeps the research read projection envelope", async () => {
    const response = await getResearch();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ profiles: [{ id: "profile-1" }] });
    expect(mocks.runVisitResearchRead).toHaveBeenCalledWith(mocks.researchDependencies.repository);
  });

  it("keeps the research success envelope", async () => {
    const response = await postResearch(postRequest("/api/agents/visit/research", { name: "Dennis" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "profile-1", profiles: [{ id: "profile-1" }] });
    expect(mocks.runVisitResearch).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Dennis", company: "CabLate" }),
      mocks.researchDependencies,
    );
  });

  it("maps invalid research input to the existing 400 envelope", async () => {
    mocks.runVisitResearch.mockResolvedValue({ kind: "invalid", message: "缺少要調查的對象姓名" });

    const response = await postResearch(postRequest("/api/agents/visit/research", {}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "缺少要調查的對象姓名" });
  });

  it("maps a research provider failure to the existing 502 envelope", async () => {
    mocks.runVisitResearch.mockResolvedValue({ kind: "error", message: "調查失敗，請稍後再試" });

    const response = await postResearch(postRequest("/api/agents/visit/research", { name: "Dennis" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "調查失敗，請稍後再試" });
  });
});
