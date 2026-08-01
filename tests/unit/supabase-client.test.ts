import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type { Database } from "@/lib/database.types";

const createClient = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const originalEnv = {
  url: process.env.SUPABASE_URL,
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
  anon: process.env.SUPABASE_ANON_KEY,
};

describe("Main Supabase client boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    createClient.mockReset();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    if (originalEnv.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalEnv.url;
    if (originalEnv.serviceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.serviceRole;
    if (originalEnv.anon === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = originalEnv.anon;
    vi.restoreAllMocks();
  });

  it("keeps the typed entrypoint on one client instance", async () => {
    const client = { from: vi.fn() };
    createClient.mockReturnValue(client);
    process.env.SUPABASE_URL = "https://main.example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_ANON_KEY = "anon";

    const { getMainSupabase } = await import("@/lib/supabase");

    expect(getMainSupabase()).toBe(client);
    expect(getMainSupabase()).toBe(client);
    expect(createClient).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledWith(
      "https://main.example.supabase.co",
      "service-role",
      { auth: { persistSession: false } }
    );
  });

  it("preserves the missing-configuration failure", async () => {
    const { getMainSupabase } = await import("@/lib/supabase");

    expect(() => getMainSupabase()).toThrow(/Missing SUPABASE_URL/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("contains the Main schema tables needed for the first domain migration", () => {
    type MainTables = Database["public"]["Tables"];

    expectTypeOf<MainTables>().toHaveProperty("contacts");
    expectTypeOf<MainTables>().toHaveProperty("contact_profiles");
    expectTypeOf<MainTables>().toHaveProperty("line_agents");
  });
});
