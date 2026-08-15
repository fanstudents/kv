import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getVersion } from "@/app/api/version/route";

beforeEach(() => {
  vi.stubEnv("KV_APP_VERSION", "");
  vi.stubEnv("KV_COMMIT_SHA", "");
  vi.stubEnv("KV_RUNTIME_ENV", "");
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("SUPABASE_ANON_KEY", "");
});

afterEach(() => vi.unstubAllEnvs());

describe("runtime operations routes", () => {
  it("reports version metadata without exposing configuration values", async () => {
    vi.stubEnv("KV_COMMIT_SHA", "abc123");
    vi.stubEnv("KV_RUNTIME_ENV", "staging");

    const response = await getVersion();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      service: "agent-kv",
      version: "0.1.0",
      commit: "abc123",
      environment: "staging",
    });
  });

  it("reports configured Main Supabase readiness without making a provider call", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-secret");
    vi.stubEnv("KV_COMMIT_SHA", "staging-commit");

    const response = await getHealth();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      service: "agent-kv",
      status: "ok",
      commit: "staging-commit",
      checks: { mainSupabase: "configured", mainSupabasePrivileged: "configured" },
    });
    expect(JSON.stringify(body)).not.toContain("server-secret");
  });

  it("degrades readiness when Main Supabase only has an anon key", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon-key");

    const response = await getHealth();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "degraded",
      checks: { mainSupabase: "configured", mainSupabasePrivileged: "missing" },
    });
  });

  it("fails readiness when Main Supabase configuration is absent", async () => {
    const response = await getHealth();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "degraded",
      checks: { mainSupabase: "missing", mainSupabasePrivileged: "missing" },
    });
  });
});
