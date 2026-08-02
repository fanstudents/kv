import { beforeEach, describe, expect, it, vi } from "vitest";


const requestWebSearchJson = vi.hoisted(() => vi.fn());
vi.mock("@/adapters/openai/client", () => ({ requestWebSearchJson }));

import { openAiVisitResearchProvider } from "@/adapters/visit/openai-visit-research";

describe("OpenAI Visit research provider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds the existing public-research query", () => {
    expect(openAiVisitResearchProvider.buildSearchInput({
      contactId: "contact-1",
      inviteId: "invite-1",
      name: "Dennis",
      company: "CabLate",
      title: "Founder",
      email: "dennis@example.test",
    })).toBe([
      "拜訪對象：Dennis",
      "職稱：Founder",
      "公司：CabLate",
      "Email 網域：example.test",
      "請搜尋這家公司與這個人的公開資料，整理成見面前的行前功課。",
    ].join("\n"));
  });

  it("keeps the OpenAI request and normalizes untrusted response fields", async () => {
    requestWebSearchJson.mockResolvedValue({
      companySummary: "  Company  ",
      personSummary: "  Person  ",
      links: [
        { label: "Official", url: "https://example.test", kind: "website" },
        { label: "Unsafe", url: "javascript:alert(1)" },
      ],
      highlights: Array.from({ length: 10 }, (_, index) => `h${index}`),
      talkingPoints: Array.from({ length: 8 }, (_, index) => `t${index}`),
      sources: ["https://example.test/source", "not-a-url"],
      confidence: 2,
    });

    await expect(openAiVisitResearchProvider.search("search input")).resolves.toEqual({
      companySummary: "Company",
      personSummary: "Person",
      links: [{ label: "Official", url: "https://example.test", kind: "website" }],
      highlights: ["h0", "h1", "h2", "h3", "h4", "h5", "h6", "h7"],
      talkingPoints: ["t0", "t1", "t2", "t3", "t4", "t5"],
      sources: ["https://example.test/source"],
      confidence: 1,
    });
    expect(requestWebSearchJson).toHaveBeenCalledWith(
      expect.objectContaining({ input: "search input", model: "gpt-4o" }),
      { operation: "拜訪前背景調查", agentSlug: "visit" }
    );
  });
});
