import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { analyticsdata, ensureFreshAccessToken, getGoogleOAuthClient, runReport } = vi.hoisted(() => ({
  analyticsdata: vi.fn(),
  ensureFreshAccessToken: vi.fn(),
  getGoogleOAuthClient: vi.fn(),
  runReport: vi.fn(),
}));

vi.mock("googleapis", () => ({ google: { analyticsdata } }));
vi.mock("@/lib/google-auth", () => ({ ensureFreshAccessToken, getGoogleOAuthClient }));

import { getTrafficOverview } from "@/lib/ga4";

const GA4_PROPERTY_KEY = "GA4_PROPERTY_ID";
const originalPropertyId = process.env[GA4_PROPERTY_KEY];

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env[GA4_PROPERTY_KEY];
  getGoogleOAuthClient.mockReturnValue({ kind: "oauth-client" });
  analyticsdata.mockReturnValue({ properties: { runReport } });
});

afterEach(() => {
  if (originalPropertyId === undefined) delete process.env[GA4_PROPERTY_KEY];
  else process.env[GA4_PROPERTY_KEY] = originalPropertyId;
});

describe("GA4 read adapter", () => {
  it("rejects a missing property ID before creating OAuth or GA4 SDK clients", async () => {
    await expect(getTrafficOverview()).rejects.toThrow("Missing GA4_PROPERTY_ID environment variable");

    expect(getGoogleOAuthClient).not.toHaveBeenCalled();
    expect(ensureFreshAccessToken).not.toHaveBeenCalled();
    expect(analyticsdata).not.toHaveBeenCalled();
    expect(runReport).not.toHaveBeenCalled();
  });

  it("waits for token refresh, maps the three report queries, and projects GA4 values", async () => {
    process.env[GA4_PROPERTY_KEY] = "1234";
    let releaseRefresh: (() => void) | undefined;
    ensureFreshAccessToken.mockReturnValue(
      new Promise<void>((resolve) => {
        releaseRefresh = resolve;
      })
    );
    runReport
      .mockResolvedValueOnce({
        data: {
          rows: [
            {
              dimensionValues: [{ value: "date_range_1" }],
              metricValues: [{ value: "12" }, { value: "2" }, { value: "1" }],
            },
            {
              dimensionValues: [{ value: "date_range_0" }],
              metricValues: [{ value: "20" }, { value: "5" }, { value: "4" }],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          rows: [
            { dimensionValues: [{ value: "Organic Search" }], metricValues: [{ value: "15" }, { value: "3" }] },
            { dimensionValues: [], metricValues: [] },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          rows: [
            { dimensionValues: [{ value: "20260731" }], metricValues: [{ value: "7" }, { value: "2" }] },
            { dimensionValues: [{ value: "bad" }], metricValues: [] },
          ],
        },
      });

    const overviewPromise = getTrafficOverview(7);

    expect(ensureFreshAccessToken).toHaveBeenCalledWith({ kind: "oauth-client" });
    expect(analyticsdata).not.toHaveBeenCalled();

    releaseRefresh?.();

    await expect(overviewPromise).resolves.toEqual({
      sessions: 20,
      activeUsers: 5,
      conversions: 4,
      sessionsDelta: 8,
      byChannel: [
        { channel: "Organic Search", sessions: 15, conversions: 3 },
        { channel: "", sessions: 0, conversions: 0 },
      ],
      dailyTrend: [
        { date: "2026-07-31", sessions: 7, conversions: 2 },
        { date: "bad", sessions: 0, conversions: 0 },
      ],
    });

    expect(analyticsdata).toHaveBeenCalledWith({ version: "v1beta", auth: { kind: "oauth-client" } });
    expect(runReport).toHaveBeenNthCalledWith(1, {
      property: "properties/1234",
      requestBody: {
        dateRanges: [
          { startDate: "7daysAgo", endDate: "today" },
          { startDate: "14daysAgo", endDate: "8daysAgo" },
        ],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "conversions" }],
      },
    });
    expect(runReport).toHaveBeenNthCalledWith(2, {
      property: "properties/1234",
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "conversions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "6",
      },
    });
    expect(runReport).toHaveBeenNthCalledWith(3, {
      property: "properties/1234",
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "conversions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      },
    });
  });
});
