#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import { buildDoctorReport } from "./doctor.mjs";

const RELEASE_PROFILES = new Set(["staging", "live"]);
const MIGRATION_PATTERN = /^(\d{14})_[a-z0-9_]+\.sql$/;
const REHEARSAL_DATABASE_PATTERN = /^kv_restore_rehearsal_\d{13}$/;
const SCHEDULES = [
  ["kv-visit-timeout", "*/2 * * * *", "/api/cron/visit-timeout"],
  ["kv-support-daily-report", "0 1 * * *", "/api/cron/support-daily-report"],
  ["kv-team-lead-report", "5 1 * * *", "/api/cron/team-lead-report"],
  ["kv-metric-snapshot", "10 17 * * *", "/api/cron/metric-snapshot"],
  ["kv-kb-recheck", "0 18 * * 1", "/api/cron/kb-recheck"],
];

function required(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing ${name}`);
  }
  return value.trim();
}

export function inspectMigrationInventory(cwd = process.cwd()) {
  const directory = join(cwd, "supabase", "migrations");
  const files = existsSync(directory)
    ? readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()
    : [];
  if (files.length === 0) throw new Error("No Supabase migrations found");
  if (files[0] !== "20260801105708_live_baseline.sql") {
    throw new Error("Canonical baseline migration must be first");
  }

  const versions = files.map((file) => {
    const match = file.match(MIGRATION_PATTERN);
    if (!match) throw new Error(`Invalid migration filename: ${file}`);
    return match[1];
  });
  if (new Set(versions).size !== versions.length) throw new Error("Duplicate migration version found");

  return {
    files,
    latestVersion: versions.at(-1),
  };
}

export function commitsMatch(expected, actual) {
  if (!expected || !actual || Math.min(expected.length, actual.length) < 7) return false;
  return expected.startsWith(actual) || actual.startsWith(expected);
}

export function databaseUrlMatchesProject(databaseUrl, projectRef) {
  try {
    const parsed = new URL(databaseUrl);
    const identity = `${parsed.hostname} ${decodeURIComponent(parsed.username)}`.toLowerCase();
    return projectRef.length >= 6 && identity.includes(projectRef.toLowerCase());
  } catch {
    return false;
  }
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function readPackage(cwd) {
  return JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
}

function releaseProfile(args) {
  const option = args.find((arg) => arg.startsWith("--profile="));
  const profile = option?.slice("--profile=".length) ?? "staging";
  if (!RELEASE_PROFILES.has(profile)) throw new Error("Release profile must be staging or live");
  return profile;
}

function optionValue(args, name) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

export function buildReleaseManifest(env = process.env, cwd = process.cwd(), profile = "staging") {
  const inventory = inspectMigrationInventory(cwd);
  const commit = git(cwd, ["rev-parse", "HEAD"]);
  const packageJson = readPackage(cwd);
  return {
    service: packageJson.name,
    version: env.KV_APP_VERSION?.trim() || packageJson.version,
    commit,
    schemaVersion: inventory.latestVersion,
    environment: profile,
    migrations: inventory.files,
  };
}

export function assertReleasePreflight(env = process.env, cwd = process.cwd(), profile = "staging") {
  const manifest = buildReleaseManifest(env, cwd, profile);
  const doctor = buildDoctorReport(env, profile, cwd);
  if (!doctor.ready) throw new Error(`Doctor blocked: ${doctor.failures.join(", ")}`);

  const runtimeEnvironment = required(env.KV_RUNTIME_ENV, "KV_RUNTIME_ENV");
  if (runtimeEnvironment !== profile) {
    throw new Error(`KV_RUNTIME_ENV must equal ${profile}`);
  }
  const configuredCommit = required(env.KV_COMMIT_SHA, "KV_COMMIT_SHA");
  if (!commitsMatch(configuredCommit, manifest.commit)) {
    throw new Error("KV_COMMIT_SHA does not match the checked-out commit");
  }
  const configuredSchema = required(env.KV_SCHEMA_VERSION, "KV_SCHEMA_VERSION");
  if (configuredSchema !== manifest.schemaVersion) {
    throw new Error("KV_SCHEMA_VERSION does not match the latest migration");
  }
  if (git(cwd, ["status", "--porcelain"]).length > 0) {
    throw new Error("Release worktree must be clean");
  }
  return manifest;
}

function projectTarget(env, profile) {
  const databaseUrl = required(env.SUPABASE_DB_URL, "SUPABASE_DB_URL");
  const variable = profile === "live" ? "KV_LIVE_PROJECT_REF" : "KV_STAGING_PROJECT_REF";
  const projectRef = required(env[variable], variable);
  if (!databaseUrlMatchesProject(databaseUrl, projectRef)) {
    throw new Error(`SUPABASE_DB_URL does not match ${variable}`);
  }
  return { databaseUrl, projectRef };
}

function runSupabase(args) {
  const cli = join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");
  if (!existsSync(cli)) throw new Error("Pinned Supabase CLI is not installed; run npm ci");
  const result = spawnSync(process.execPath, [cli, ...args], {
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) throw new Error(`Supabase CLI failed with exit code ${result.status ?? "unknown"}`);
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.capture ? "utf8" : undefined,
    stdio: options.capture ? "pipe" : "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    const detail = options.capture ? result.stderr?.trim() : "";
    throw new Error(`${command} failed with exit code ${result.status ?? "unknown"}${detail ? `: ${detail}` : ""}`);
  }
  return options.capture ? result.stdout.trim() : "";
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function upsertVaultSecretSql(name, value, description) {
  return `
do $vault$
declare
  v_secret_id uuid;
begin
  select id into v_secret_id from vault.secrets where name = ${sqlLiteral(name)};
  if v_secret_id is null then
    perform vault.create_secret(${sqlLiteral(value)}, ${sqlLiteral(name)}, ${sqlLiteral(description)});
  else
    perform vault.update_secret(v_secret_id, ${sqlLiteral(value)}, ${sqlLiteral(name)}, ${sqlLiteral(description)});
  end if;
end
$vault$;`;
}

export function buildScheduleApplySql({ baseUrl, cronSecret }) {
  const root = required(baseUrl, "APP_BASE_URL").replace(/\/$/, "");
  const secret = required(cronSecret, "CRON_SECRET");
  const scheduleSql = SCHEDULES.map(([name, expression, endpoint]) => `
select cron.unschedule(jobid) from cron.job where jobname = ${sqlLiteral(name)};
select cron.schedule(
  ${sqlLiteral(name)},
  ${sqlLiteral(expression)},
  $command$select kv_ops.dispatch_scheduled_endpoint(${sqlLiteral(name)}, ${sqlLiteral(endpoint)});$command$
);`).join("\n");
  return `${upsertVaultSecretSql("kv_app_base_url", root, "KV deployment base URL used by Supabase Cron")}
${upsertVaultSecretSql("kv_cron_secret", secret, "KV x-cron-key used by Supabase Cron")}
${scheduleSql}
select cron.unschedule(jobid) from cron.job where jobname = 'kv-schedule-ledger-prune';
select cron.schedule(
  'kv-schedule-ledger-prune',
  '30 18 * * *',
  $command$select kv_ops.prune_schedule_dispatches();$command$
);
`;
}

export function schedulePlanSql() {
  return `
select extname, extversion
from pg_extension
where extname in ('pg_cron', 'pg_net', 'supabase_vault')
order by extname;

select jobid, jobname, schedule, active
from cron.job
where jobname like 'kv-%'
order by jobname;
`;
}

export function scheduleVerificationSql() {
  return `${schedulePlanSql()}
select
  exists(select 1 from vault.secrets where name = 'kv_app_base_url') as has_base_url,
  exists(select 1 from vault.secrets where name = 'kv_cron_secret') as has_cron_secret;

select d.job_name, d.endpoint, d.enqueued_at, r.status_code, r.timed_out, r.error_msg
from kv_ops.schedule_dispatches d
left join net._http_response r on r.id = d.request_id
order by d.enqueued_at desc
limit 20;
`;
}

function runSupabaseSql(databaseUrl, sql) {
  const path = join(process.env.TEMP || process.cwd(), `kv-release-${Date.now()}-${Math.random().toString(16).slice(2)}.sql`);
  writeFileSync(path, sql, "utf8");
  try {
    runSupabase(["db", "query", "--db-url", databaseUrl, "--file", path]);
  } finally {
    rmSync(path, { force: true });
  }
}

function backupPath(env, cwd) {
  const path = resolve(required(env.KV_BACKUP_PATH, "KV_BACKUP_PATH"));
  const withinRepo = relative(cwd, path);
  if (withinRepo && !withinRepo.startsWith("..") && !resolve(withinRepo).startsWith("..")) {
    throw new Error("KV_BACKUP_PATH must be outside the repository");
  }
  if (!existsSync(dirname(path))) throw new Error("KV_BACKUP_PATH parent directory does not exist");
  return path;
}

function databaseUrlForName(databaseUrl, databaseName) {
  const parsed = new URL(databaseUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

function assertRehearsalDatabaseName(databaseName) {
  if (!REHEARSAL_DATABASE_PATTERN.test(databaseName)) {
    throw new Error("Unsafe restore rehearsal database name");
  }
  return databaseName;
}

function databaseSnapshot(databaseUrl) {
  return runCommand("psql", [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-Atc", `
select 'tables=' || count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';
select 'line_agents=' || count(*) from public.line_agents;
select 'line_subscribers=' || count(*) from public.line_subscribers;
select 'contacts=' || count(*) from public.contacts;
select 'knowledge_base=' || count(*) from public.knowledge_base;
select 'meetings=' || count(*) from public.meetings;
select 'teachify_orders=' || count(*) from public.teachify_orders;
`], { capture: true });
}

function createBackup(databaseUrl, path) {
  if (existsSync(path)) throw new Error("KV_BACKUP_PATH already exists; refusing to overwrite it");
  runCommand("pg_dump", [
    databaseUrl,
    "--format=custom",
    "--schema=public",
    "--no-owner",
    "--no-privileges",
    `--file=${path}`,
  ]);
}

function verifyBackup(path) {
  if (!existsSync(path)) throw new Error("KV_BACKUP_PATH does not exist");
  const listing = runCommand("pg_restore", ["--list", path], { capture: true });
  const tableEntries = listing.split(/\r?\n/).filter((line) => / TABLE public /.test(line));
  if (tableEntries.length === 0) throw new Error("Backup archive contains no public tables");
  return tableEntries.length;
}

function rehearseBackup(databaseUrl, path) {
  verifyBackup(path);
  const databaseName = assertRehearsalDatabaseName(`kv_restore_rehearsal_${Date.now()}`);
  const targetUrl = databaseUrlForName(databaseUrl, databaseName);
  const sourceSnapshot = databaseSnapshot(databaseUrl);
  runCommand("psql", [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-c", `create database ${databaseName} template template0;`]);
  try {
    runCommand("pg_restore", [
      "--exit-on-error",
      "--no-owner",
      "--no-privileges",
      `--dbname=${targetUrl}`,
      path,
    ]);
    const restoredSnapshot = databaseSnapshot(targetUrl);
    if (restoredSnapshot !== sourceSnapshot) {
      throw new Error(`Restore snapshot mismatch\nsource:\n${sourceSnapshot}\nrestored:\n${restoredSnapshot}`);
    }
    return { databaseName, snapshot: restoredSnapshot };
  } finally {
    runCommand("psql", [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists ${databaseName} with (force);`]);
  }
}

export async function verifyRemoteRelease({ baseUrl, expected, fetchImpl = fetch }) {
  const root = required(baseUrl, "APP_BASE_URL").replace(/\/$/, "");
  const [versionResponse, healthResponse] = await Promise.all([
    fetchImpl(`${root}/api/version`, { headers: { Accept: "application/json" } }),
    fetchImpl(`${root}/api/health`, { headers: { Accept: "application/json" } }),
  ]);
  if (!versionResponse.ok) throw new Error(`Remote version returned HTTP ${versionResponse.status}`);
  if (!healthResponse.ok) throw new Error(`Remote health returned HTTP ${healthResponse.status}`);

  const version = await versionResponse.json();
  const health = await healthResponse.json();
  if (!commitsMatch(expected.commit, version.commit)) throw new Error("Remote commit does not match release commit");
  if (version.schemaVersion !== expected.schemaVersion) throw new Error("Remote schema version does not match release schema");
  if (version.environment !== expected.environment) throw new Error("Remote environment does not match release profile");
  if (health.status !== "ok") throw new Error("Remote health is not ready");
  return { version, health };
}

async function main() {
  const [command = "preflight", ...args] = process.argv.slice(2);
  const profile = releaseProfile(args);
  const manifest = assertReleasePreflight(process.env, process.cwd(), profile);

  if (command === "preflight") {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  if (command === "verify-remote") {
    const result = await verifyRemoteRelease({
      baseUrl: process.env.APP_BASE_URL,
      expected: manifest,
    });
    console.log(`Release verified: ${result.version.commit} / schema ${result.version.schemaVersion}`);
    return;
  }

  const target = projectTarget(process.env, profile);
  if (command === "backup-create") {
    const path = backupPath(process.env, process.cwd());
    createBackup(target.databaseUrl, path);
    console.log(`Backup created outside repository: ${path}`);
    return;
  }

  if (command === "backup-verify") {
    const path = backupPath(process.env, process.cwd());
    console.log(`Backup archive verified: ${verifyBackup(path)} public table entries`);
    return;
  }

  if (command === "backup-rehearse") {
    if (process.env.KV_RELEASE_RESTORE_REHEARSAL !== "1") {
      throw new Error("KV_RELEASE_RESTORE_REHEARSAL must be 1");
    }
    const path = backupPath(process.env, process.cwd());
    const result = rehearseBackup(target.databaseUrl, path);
    console.log(`Restore rehearsal passed and temporary database was removed: ${result.databaseName}`);
    console.log(result.snapshot);
    return;
  }

  if (command === "migration-plan") {
    runSupabase(["migration", "list", "--db-url", target.databaseUrl]);
    runSupabase(["db", "push", "--dry-run", "--db-url", target.databaseUrl]);
    return;
  }

  if (command === "schedule-plan") {
    runSupabaseSql(target.databaseUrl, schedulePlanSql());
    return;
  }

  if (command === "schedule-apply") {
    const confirmedProject = required(optionValue(args, "confirm-project"), "--confirm-project");
    if (confirmedProject !== target.projectRef) throw new Error("Confirmed project ref does not match release target");
    if (process.env.KV_RELEASE_SCHEDULE_APPLY !== "1") throw new Error("KV_RELEASE_SCHEDULE_APPLY must be 1");
    runSupabaseSql(target.databaseUrl, buildScheduleApplySql({
      baseUrl: process.env.APP_BASE_URL,
      cronSecret: process.env.CRON_SECRET,
    }));
    return;
  }

  if (command === "schedule-verify") {
    runSupabaseSql(target.databaseUrl, scheduleVerificationSql());
    return;
  }

  if (command === "migration-apply") {
    const confirmedProject = required(optionValue(args, "confirm-project"), "--confirm-project");
    if (confirmedProject !== target.projectRef) throw new Error("Confirmed project ref does not match release target");
    if (process.env.KV_RELEASE_BACKUP_CONFIRMED !== "1") throw new Error("KV_RELEASE_BACKUP_CONFIRMED must be 1");
    if (process.env.KV_RELEASE_MIGRATION_APPLY !== "1") throw new Error("KV_RELEASE_MIGRATION_APPLY must be 1");
    runSupabase(["db", "push", "--db-url", target.databaseUrl]);
    runSupabase(["migration", "list", "--db-url", target.databaseUrl]);
    return;
  }

  throw new Error(`Unknown release command: ${command}`);
}

const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (entry === resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(`Release blocked: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
