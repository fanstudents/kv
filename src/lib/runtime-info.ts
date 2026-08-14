import packageJson from "../../package.json";

const firstPresent = (...values: Array<string | undefined>) =>
  values.find((value) => typeof value === "string" && value.trim().length > 0) ?? "unknown";

/** Technical deployment metadata shared by the public health/version routes. */
export function getRuntimeInfo() {
  return {
    service: packageJson.name,
    version: firstPresent(process.env.KV_APP_VERSION, packageJson.version),
    commit: firstPresent(
      process.env.KV_COMMIT_SHA,
      process.env.GIT_COMMIT_SHA,
      process.env.VERCEL_GIT_COMMIT_SHA,
      process.env.GITHUB_SHA,
    ),
    environment: firstPresent(process.env.KV_RUNTIME_ENV, process.env.NODE_ENV),
  } as const;
}

export function getRuntimeReadiness() {
  const hasMainUrl = Boolean(process.env.SUPABASE_URL);
  const hasMainKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
  const hasPrivilegedKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const ready = hasMainUrl && hasMainKey;

  return {
    ...getRuntimeInfo(),
    status: ready ? "ok" : "degraded",
    checks: {
      mainSupabase: ready ? "configured" : "missing",
      mainSupabasePrivileged: hasPrivilegedKey ? "configured" : "missing",
    },
  } as const;
}
