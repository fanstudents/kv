import { beforeAll, describe, expect, it } from "vitest";

import { getTrafficOverview } from "@/lib/ga4";
import { getSearchOverview } from "@/lib/gsc";
import { listWeekOverview } from "@/lib/google";
import { getIntegrationStatus } from "@/lib/integration-status";

const GATE = "GOOGLE_READ_ACCEPTANCE";
const COMMAND = "npm run acceptance:google:read";
const REQUIRED_ENV = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "GA4_PROPERTY_ID",
  "GSC_SITE_URL",
] as const;

beforeAll(() => {
  if (process.env[GATE] !== "1") {
    throw new Error(`${GATE} is opt-in. Set ${GATE}=1 before running ${COMMAND}.`);
  }

  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Google read acceptance is missing ${missing.join(", ")}; no provider calls were made.`);
  }
});

describe.sequential("Google read provider acceptance", () => {
  it("authenticates the shared Google account used by Calendar, Gmail, GA4, and GSC", async () => {
    const status = await getIntegrationStatus();

    expect(status.gmail.connected).toBe(true);
    expect(status["google-calendar"].connected).toBe(true);
    expect(status.ga4.connected).toBe(true);
    expect(status.gsc.connected).toBe(true);
  });

  it("reads the configured GA4 property through the production provider", async () => {
    const overview = await getTrafficOverview(7);

    expect(overview.sessions).toBeGreaterThanOrEqual(0);
    expect(overview.activeUsers).toBeGreaterThanOrEqual(0);
    expect(overview.conversions).toBeGreaterThanOrEqual(0);
    expect(overview.byChannel).toBeInstanceOf(Array);
    expect(overview.dailyTrend).toBeInstanceOf(Array);
  });

  it("reads the configured Search Console site through the production provider", async () => {
    const overview = await getSearchOverview(7);

    expect(overview.totalClicks).toBeGreaterThanOrEqual(0);
    expect(overview.totalImpressions).toBeGreaterThanOrEqual(0);
    expect(overview.topQueries).toBeInstanceOf(Array);
    expect(overview.dailyTrend).toBeInstanceOf(Array);
  });

  it("reads the primary Calendar without creating or changing events", async () => {
    const overview = await listWeekOverview();

    expect(overview.dayCounts).toHaveLength(7);
    expect(overview.dayCounts.every((count) => Number.isInteger(count) && count >= 0)).toBe(true);
    expect(overview.upcoming).toBeInstanceOf(Array);
    expect(overview.warnings).toBeInstanceOf(Array);
  });
});
