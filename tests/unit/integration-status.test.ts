import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { calendar, getGoogleOAuthClient } = vi.hoisted(() => ({
  calendar: vi.fn(),
  getGoogleOAuthClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("googleapis", () => ({ google: { calendar } }));
vi.mock("@/lib/google-auth", () => ({ getGoogleOAuthClient }));

import { getIntegrationPreflight } from "@/lib/integration-status";

const ENVIRONMENT_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "OPENAI_API_KEY",
  "LINE_CHANNEL_ID",
  "LINE_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_SUPPORT_CHANNEL_ID",
  "LINE_SUPPORT_CHANNEL_SECRET",
  "LINE_SUPPORT_CHANNEL_ACCESS_TOKEN",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "GA4_PROPERTY_ID",
  "GSC_SITE_URL",
  "FIRECRAWL_API_KEY",
  "TEACHIFY_WEBHOOK_SECRET",
] as const;

const originalEnvironment = Object.fromEntries(ENVIRONMENT_KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ENVIRONMENT_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENVIRONMENT_KEYS) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("integration configuration preflight", () => {
  it("reports missing configuration without invoking providers", () => {
    const preflight = getIntegrationPreflight();

    expect(preflight).toMatchObject({
      gmail: { configured: false, detail: expect.stringContaining("GOOGLE_CLIENT_ID") },
      openai: { configured: false, detail: "缺少 OPENAI_API_KEY" },
      supabase: { configured: false, detail: expect.stringContaining("SUPABASE_URL") },
      teachify: { configured: false, detail: "缺少 TEACHIFY_WEBHOOK_SECRET" },
    });
    expect(calendar).not.toHaveBeenCalled();
    expect(getGoogleOAuthClient).not.toHaveBeenCalled();
  });

  it("reports complete configuration without exposing secret values", () => {
    process.env.SUPABASE_URL = "https://project.example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    process.env.OPENAI_API_KEY = "openai-secret";
    process.env.LINE_CHANNEL_SECRET = "line-secret";
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "line-token";
    process.env.LINE_SUPPORT_CHANNEL_SECRET = "support-secret";
    process.env.LINE_SUPPORT_CHANNEL_ACCESS_TOKEN = "support-token";
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "google-refresh";
    process.env.GA4_PROPERTY_ID = "123";
    process.env.GSC_SITE_URL = "https://example.com";
    process.env.FIRECRAWL_API_KEY = "firecrawl-secret";
    process.env.TEACHIFY_WEBHOOK_SECRET = "teachify-secret";

    const preflight = getIntegrationPreflight();

    expect(preflight).toMatchObject({
      gmail: { configured: true },
      "google-calendar": { configured: true },
      ga4: { configured: true },
      gsc: { configured: true },
      "line-primary": { configured: true },
      "line-support": { configured: true },
      openai: { configured: true },
      supabase: { configured: true },
      firecrawl: { configured: true },
      teachify: { configured: true },
    });
    expect(JSON.stringify(preflight)).not.toMatch(/secret|token|refresh|google-client/i);
    expect(calendar).not.toHaveBeenCalled();
    expect(getGoogleOAuthClient).not.toHaveBeenCalled();
  });
});
