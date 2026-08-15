#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { buildDoctorReport } from "./doctor.mjs";

const RELEASE_PROFILES = new Set(["staging", "live"]);
const MIGRATION_PATTERN = /^(\d{14})_[a-z0-9_]+\.sql$/;

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
  if (command === "migration-plan") {
    runSupabase(["migration", "list", "--db-url", target.databaseUrl]);
    runSupabase(["db", "push", "--dry-run", "--db-url", target.databaseUrl]);
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
