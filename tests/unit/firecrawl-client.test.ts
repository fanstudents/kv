import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FirecrawlQuotaError,
  getCreditUsage,
  mapSite,
  scrapeUrl,
} from "@/adapters/knowledge-base/firecrawl-client";

const initialApiKey = process.env.FIRECRAWL_API_KEY;

beforeEach(() => {
  process.env.FIRECRAWL_API_KEY = "test-firecrawl-key";
});

afterEach(() => {
  if (initialApiKey === undefined) delete process.env.FIRECRAWL_API_KEY;
  else process.env.FIRECRAWL_API_KEY = initialApiKey;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Firecrawl client", () => {
  it("maps credit and scrape responses without leaking provider payloads upstream", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { remainingCredits: 12, planCredits: 100, billingPeriodEnd: "2026-09-14" },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          markdown: "Useful content",
          metadata: { title: "Guide", sourceURL: "https://example.com/guide" },
        },
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCreditUsage()).resolves.toEqual({
      remaining: 12,
      plan: 100,
      periodEnd: "2026-09-14",
    });
    await expect(scrapeUrl("https://example.com/input")).resolves.toEqual({
      url: "https://example.com/guide",
      title: "Guide",
      markdown: "Useful content",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringMatching(/\/team\/credit-usage$/),
      expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringMatching(/\/scrape$/),
      expect.objectContaining({ method: "POST" }));
  });

  it.each([
    [402, "credits"],
    [401, "auth"],
    [403, "auth"],
  ] as const)("classifies HTTP %s as %s", async (status, kind) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));

    const error = await scrapeUrl("https://example.com").catch((caught) => caught);
    expect(error).toBeInstanceOf(FirecrawlQuotaError);
    expect(error).toMatchObject({ kind });
  });

  it("retries one rate-limit response and then returns the rate-limit contract", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("{}", { status: 429, headers: { "retry-after": "1" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = expect(mapSite("https://example.com", 20)).rejects.toMatchObject({ kind: "rate-limit" });
    await vi.advanceTimersByTimeAsync(1000);

    await request;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps unavailable credit status as a null fallback", async () => {
    delete process.env.FIRECRAWL_API_KEY;
    await expect(getCreditUsage()).resolves.toBeNull();
  });
});
