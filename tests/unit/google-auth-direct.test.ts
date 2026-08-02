import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { OAuth2 } = vi.hoisted(() => ({
  OAuth2: vi.fn(function OAuth2() {
    return {
      getAccessToken: vi.fn(),
      setCredentials: vi.fn(),
    };
  }),
}));

vi.mock("googleapis", () => ({
  google: {
    auth: { OAuth2 },
  },
}));

const GOOGLE_ENV_KEYS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"] as const;
const originalEnvironment = Object.fromEntries(GOOGLE_ENV_KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  for (const key of GOOGLE_ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of GOOGLE_ENV_KEYS) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Google OAuth read boundary", () => {
  it("rejects incomplete configuration before constructing an OAuth SDK client", async () => {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";

    const { getGoogleOAuthClient } = await import("@/lib/google-auth");

    expect(() => getGoogleOAuthClient()).toThrow(
      "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN environment variables"
    );
    expect(OAuth2).not.toHaveBeenCalled();
  });

  it("caches the configured client and refreshes it only through the explicit read boundary", async () => {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_REFRESH_TOKEN = "refresh-token";

    const { ensureFreshAccessToken, getGoogleOAuthClient } = await import("@/lib/google-auth");
    const client = getGoogleOAuthClient();

    expect(OAuth2).toHaveBeenCalledOnce();
    expect(OAuth2).toHaveBeenCalledWith("client-id", "client-secret");
    expect(client.setCredentials).toHaveBeenCalledWith({ refresh_token: "refresh-token" });
    expect(getGoogleOAuthClient()).toBe(client);

    const mockedClient = client as unknown as { getAccessToken: () => Promise<unknown> };
    await ensureFreshAccessToken(mockedClient as never);

    expect(mockedClient.getAccessToken).toHaveBeenCalledOnce();
  });
});
