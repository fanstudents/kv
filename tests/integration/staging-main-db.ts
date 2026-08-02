import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export interface StagingMainDatabaseEnvironment {
  url: string;
  serviceRoleKey: string;
}

export function requireStagingMainDatabaseEnvironment(
  gateName: string,
  command: string,
): StagingMainDatabaseEnvironment {
  if (process.env[gateName] !== "1") {
    throw new Error(`${gateName} is opt-in. Set ${gateName}=1 before running ${command}.`);
  }

  const projectRef = process.env.KV_STAGING_PROJECT_REF;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!projectRef || !url || !serviceRoleKey) {
    throw new Error(`${gateName} requires KV_STAGING_PROJECT_REF, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY.`);
  }
  if (!/^[a-z0-9]{20}$/.test(projectRef)) {
    throw new Error("KV_STAGING_PROJECT_REF must be an exact 20-character Supabase project ref.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL must be an absolute HTTPS URL for the allowlisted staging project.");
  }

  const expectedHost = `${projectRef}.supabase.co`;
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== expectedHost ||
    parsedUrl.port !== "" ||
    parsedUrl.username !== "" ||
    parsedUrl.password !== ""
  ) {
    throw new Error(`Refusing staging DB acceptance against non-allowlisted SUPABASE_URL host: ${parsedUrl.hostname || "(missing host)"}`);
  }

  return { url, serviceRoleKey };
}

export function createStagingMainDatabaseClient(
  environment: StagingMainDatabaseEnvironment,
): SupabaseClient<Database> {
  return createClient<Database>(environment.url, environment.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
