import { beforeEach, describe, expect, it, vi } from "vitest";


const { requestWebSearchJson, createChatCompletion, scrapeUrl } = vi.hoisted(() => ({
  requestWebSearchJson: vi.fn(),
  createChatCompletion: vi.fn(),
  scrapeUrl: vi.fn(),
}));
vi.mock("@/adapters/openai/client", () => ({ requestWebSearchJson, createChatCompletion }));
vi.mock("@/adapters/knowledge-base/firecrawl-client", () => ({ scrapeUrl }));

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

  it("uses Firecrawl only to fill a missing company summary from an official site", async () => {
    scrapeUrl.mockResolvedValue({
      url: "https://example.test/about",
      title: "About",
      markdown: "Example builds industrial automation systems.",
    });
    createChatCompletion.mockResolvedValue({ choices: [{ message: { content: '{"summary":"工業自動化公司"}' } }] });
    const current = {
      companySummary: "",
      personSummary: "Founder",
      links: [{ label: "Official", url: "https://example.test/about", kind: "website" }],
      highlights: [],
      talkingPoints: [],
      sources: [],
      confidence: 0.8,
    };

    await expect(
      openAiVisitResearchProvider.enrichCompanyProfile(
        { contactId: "contact-1", name: "Dennis", company: "Example", title: null, email: "dennis@example.test" },
        current,
      ),
    ).resolves.toEqual({
      ...current,
      companySummary: "工業自動化公司",
      sources: ["https://example.test/about"],
    });
    expect(scrapeUrl).toHaveBeenCalledWith("https://example.test/about");
    expect(createChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4o-mini", temperature: 0 }),
      { operation: "官網簡介摘要", agentSlug: "visit" },
    );
  });

  it("does not spend Firecrawl credits for public email domains without an official link", async () => {
    const current = {
      companySummary: "",
      personSummary: "",
      links: [],
      highlights: [],
      talkingPoints: [],
      sources: [],
      confidence: 0.4,
    };

    await expect(
      openAiVisitResearchProvider.enrichCompanyProfile(
        { contactId: null, name: "Dennis", company: "Unknown", title: null, email: "dennis@gmail.com" },
        current,
      ),
    ).resolves.toBe(current);
    expect(scrapeUrl).not.toHaveBeenCalled();
  });
});
