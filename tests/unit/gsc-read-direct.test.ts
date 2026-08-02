import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { ensureFreshAccessToken, getGoogleOAuthClient, isoDate, query, webmasters } = vi.hoisted(() => ({
  ensureFreshAccessToken: vi.fn(),
  getGoogleOAuthClient: vi.fn(),
  isoDate: vi.fn((date: Date) => date.toISOString().slice(0, 10)),
  query: vi.fn(),
  webmasters: vi.fn(),
}));

vi.mock("googleapis", () => ({ google: { webmasters } }));
vi.mock("@/lib/google-auth", () => ({ ensureFreshAccessToken, getGoogleOAuthClient, isoDate }));

import { getSearchOverview } from "@/lib/gsc";

const GSC_SITE_KEY = "GSC_SITE_URL";
const originalSiteUrl = process.env[GSC_SITE_KEY];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  delete process.env[GSC_SITE_KEY];
  getGoogleOAuthClient.mockReturnValue({ kind: "oauth-client" });
  webmasters.mockReturnValue({ searchanalytics: { query } });
});

afterEach(() => {
  vi.useRealTimers();
  if (originalSiteUrl === undefined) delete process.env[GSC_SITE_KEY];
  else process.env[GSC_SITE_KEY] = originalSiteUrl;
});

describe("Search Console read adapter", () => {
  it("rejects a missing site URL before creating OAuth or Search Console SDK clients", async () => {
    await expect(getSearchOverview()).rejects.toThrow("Missing GSC_SITE_URL environment variable");

    expect(getGoogleOAuthClient).not.toHaveBeenCalled();
    expect(ensureFreshAccessToken).not.toHaveBeenCalled();
    expect(webmasters).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("waits for token refresh, applies the three-day reporting lag, and projects report rows", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"));
    process.env[GSC_SITE_KEY] = "sc-domain:example.com";
    let releaseRefresh: (() => void) | undefined;
    ensureFreshAccessToken.mockReturnValue(
      new Promise<void>((resolve) => {
        releaseRefresh = resolve;
      })
    );
    query
      .mockResolvedValueOnce({
        data: { rows: [{ clicks: 20, impressions: 200, ctr: 0.1, position: 5 }] },
      })
      .mockResolvedValueOnce({
        data: { rows: [{ clicks: 11, impressions: 110, ctr: 0.1, position: 7 }] },
      })
      .mockResolvedValueOnce({
        data: {
          rows: [
            { keys: ["answer"], clicks: 8, impressions: 80, ctr: 0.1, position: 2 },
            { keys: [], clicks: undefined, impressions: undefined, ctr: undefined, position: undefined },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          rows: [
            { keys: ["2026-07-30"], clicks: 7, impressions: 70 },
            { keys: ["2026-07-24"], clicks: 3, impressions: 30 },
          ],
        },
      });

    const overviewPromise = getSearchOverview(7);

    expect(ensureFreshAccessToken).toHaveBeenCalledWith({ kind: "oauth-client" });
    expect(webmasters).not.toHaveBeenCalled();

    releaseRefresh?.();

    await expect(overviewPromise).resolves.toEqual({
      totalClicks: 20,
      totalImpressions: 200,
      avgCtr: 0.1,
      avgPosition: 5,
      topQueries: [
        { query: "answer", clicks: 8, impressions: 80, ctr: 0.1, position: 2 },
        { query: "", clicks: 0, impressions: 0, ctr: 0, position: 0 },
      ],
      clicksDelta: 9,
      positionDelta: 2,
      dailyTrend: [
        { date: "2026-07-24", clicks: 3, impressions: 30 },
        { date: "2026-07-30", clicks: 7, impressions: 70 },
      ],
    });

    expect(webmasters).toHaveBeenCalledWith({ version: "v3", auth: { kind: "oauth-client" } });
    expect(query).toHaveBeenNthCalledWith(1, {
      siteUrl: "sc-domain:example.com",
      requestBody: { startDate: "2026-07-24", endDate: "2026-07-30" },
    });
    expect(query).toHaveBeenNthCalledWith(2, {
      siteUrl: "sc-domain:example.com",
      requestBody: { startDate: "2026-07-17", endDate: "2026-07-23" },
    });
    expect(query).toHaveBeenNthCalledWith(3, {
      siteUrl: "sc-domain:example.com",
      requestBody: {
        startDate: "2026-07-24",
        endDate: "2026-07-30",
        dimensions: ["query"],
        rowLimit: 10,
      },
    });
    expect(query).toHaveBeenNthCalledWith(4, {
      siteUrl: "sc-domain:example.com",
      requestBody: {
        startDate: "2026-07-24",
        endDate: "2026-07-30",
        dimensions: ["date"],
        rowLimit: 20,
      },
    });
  });

  it("projects an empty Search Console response without fabricating deltas", async () => {
    process.env[GSC_SITE_KEY] = "sc-domain:example.com";
    query.mockResolvedValue({ data: {} });

    await expect(getSearchOverview(2)).resolves.toEqual({
      totalClicks: 0,
      totalImpressions: 0,
      avgCtr: 0,
      avgPosition: 0,
      topQueries: [],
      clicksDelta: null,
      positionDelta: null,
      dailyTrend: [],
    });
  });
});
