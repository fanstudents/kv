import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const REQUIRED_ENV = [
  "AUTH_SECRET",
  "ADMIN_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "CRON_SECRET",
];

function runDoctor(args: string[], values: Record<string, string> = {}) {
  const env = { ...process.env };
  for (const name of REQUIRED_ENV) delete env[name];
  Object.assign(env, values);
  return spawnSync(process.execPath, ["scripts/doctor.mjs", ...args], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
}

describe("doctor command contract", () => {
  it("passes the demo profile without requiring provider secrets", () => {
    const result = runDoctor(["--profile=demo", "--strict"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Result: ready");
  });

  it("fails strict staging readiness with safe missing-name diagnostics", () => {
    const result = runDoctor(["--profile=staging", "--strict"]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("AUTH_SECRET");
    expect(result.stdout).toContain("SUPABASE_URL");
    expect(result.stdout).not.toContain("server-secret");
  });

  it("passes strict staging when runtime and Main Supabase are configured", () => {
    const result = runDoctor(["--profile=staging", "--strict"], {
      AUTH_SECRET: "auth-secret",
      ADMIN_PASSWORD: "admin-password",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "server-secret",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Result: ready");
    expect(result.stdout).not.toContain("server-secret");
  });

  it("blocks strict staging when Main Supabase only has an anon key", () => {
    const result = runDoctor(["--profile=staging", "--strict"], {
      AUTH_SECRET: "auth-secret",
      ADMIN_PASSWORD: "admin-password",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon-key",
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("server-side writes 尚未開啟");
    expect(result.stdout).toContain("Result: blocked (main-supabase)");
    expect(result.stdout).not.toContain("anon-key");
  });
});
