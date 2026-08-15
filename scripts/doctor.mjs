#!/usr/bin/env node

import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const PROFILES = new Set(["demo", "staging", "live"]);
const REQUIRED_GROUPS = {
  demo: [],
  staging: ["runtime", "main-supabase", "schema"],
  live: ["runtime", "main-supabase", "schema", "cron"],
};

const ENV_GROUPS = [
  { id: "runtime", label: "Runtime", names: ["AUTH_SECRET", "ADMIN_PASSWORD"] },
  { id: "teaching", label: "Teaching Supabase", names: ["TEACHING_SUPABASE_URL", "TEACHING_SUPABASE_ANON_KEY"] },
  { id: "openai", label: "OpenAI", names: ["OPENAI_API_KEY"] },
  { id: "line-primary", label: "Primary LINE", names: ["LINE_CHANNEL_ID", "LINE_CHANNEL_SECRET", "LINE_CHANNEL_ACCESS_TOKEN"] },
  { id: "line-support", label: "Support LINE", names: ["LINE_SUPPORT_CHANNEL_ID", "LINE_SUPPORT_CHANNEL_SECRET", "LINE_SUPPORT_CHANNEL_ACCESS_TOKEN"] },
  { id: "google", label: "Google OAuth", names: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"] },
  { id: "firecrawl", label: "Firecrawl", names: ["FIRECRAWL_API_KEY"] },
  { id: "teachify", label: "Teachify webhook", names: ["TEACHIFY_WEBHOOK_SECRET"] },
  { id: "cron", label: "Cron", names: ["CRON_SECRET"] },
  { id: "support-relay", label: "Support relay", names: ["SUPPORT_LOG_SECRET", "SUPPORT_RELAY_TARGET_URL"] },
];

function present(env, name) {
  return typeof env[name] === "string" && env[name].trim().length > 0;
}

function allOf(env, names) {
  const missing = names.filter((name) => !present(env, name));
  return {
    status: missing.length === 0 ? "configured" : missing.length === names.length ? "missing" : "partial",
    missing,
  };
}

function mainSupabaseCheck(env) {
  const missing = [];
  if (!present(env, "SUPABASE_URL")) missing.push("SUPABASE_URL");
  if (!present(env, "SUPABASE_SERVICE_ROLE_KEY") && !present(env, "SUPABASE_ANON_KEY")) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY 或 SUPABASE_ANON_KEY");
  }
  const configured = missing.length === 0;
  return {
    id: "main-supabase",
    label: "Main Supabase",
    status: configured ? "configured" : missing.length === 2 ? "missing" : "partial",
    missing,
    writeEnabled: present(env, "SUPABASE_SERVICE_ROLE_KEY"),
    detail: configured && !present(env, "SUPABASE_SERVICE_ROLE_KEY")
      ? "已設定；目前只有 anon key，server-side writes 尚未開啟"
      : configured
        ? "已設定；service-role key 可供 server-side writes"
        : "尚未完成設定",
  };
}

function migrationCheck(cwd) {
  const directory = join(cwd, "supabase", "migrations");
  const files = existsSync(directory)
    ? readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()
    : [];
  const hasBaseline = files[0] === "20260801000000_live_baseline.sql";
  return {
    id: "schema",
    label: "Main migrations",
    status: hasBaseline ? "configured" : files.length === 0 ? "missing" : "partial",
    missing: hasBaseline ? [] : ["canonical baseline migration"],
    detail: hasBaseline ? `${files.length} forward-only migrations found` : "找不到 canonical baseline migration",
  };
}

export function buildDoctorReport(env = process.env, profile = "demo", cwd = process.cwd()) {
  if (!PROFILES.has(profile)) throw new Error(`Unknown profile: ${profile}`);

  const checks = [mainSupabaseCheck(env), migrationCheck(cwd)];
  for (const group of ENV_GROUPS) {
    const result = allOf(env, group.names);
    checks.push({
      id: group.id,
      label: group.label,
      ...result,
      detail: result.status === "configured" ? "已設定；doctor 不會呼叫外部服務" : "尚未完整設定",
    });
  }

  const required = new Set(REQUIRED_GROUPS[profile]);
  const normalized = checks.map((check) => {
    const requiredCheck = required.has(check.id);
    const ready = check.status === "configured" &&
      (!requiredCheck || check.id !== "main-supabase" || check.writeEnabled);
    return {
      ...check,
      required: requiredCheck,
      ready,
    };
  });
  const failures = normalized.filter((check) => check.required && !check.ready);

  return {
    profile,
    providerCalls: false,
    ready: failures.length === 0,
    failures: failures.map((check) => check.id),
    checks: normalized,
  };
}

function parseArgs(args) {
  const profileArg = args.find((arg) => arg.startsWith("--profile="));
  return {
    profile: profileArg ? profileArg.slice("--profile=".length) : "demo",
    strict: args.includes("--strict"),
    json: args.includes("--json"),
  };
}

function printReport(report) {
  console.log(`KV doctor | profile=${report.profile} | provider calls=disabled`);
  for (const check of report.checks) {
    const icon = check.ready ? "OK" : check.required ? "FAIL" : "WARN";
    const suffix = check.missing?.length ? `；缺少 ${check.missing.join("、")}` : "";
    console.log(`${icon} ${check.label}: ${check.detail}${suffix}`);
  }
  console.log(report.ready ? "Result: ready" : `Result: blocked (${report.failures.join(", ")})`);
}

function main() {
  const { profile, strict, json } = parseArgs(process.argv.slice(2));
  if (!PROFILES.has(profile)) {
    console.error(`Unknown profile: ${profile}. Use demo, staging, or live.`);
    process.exitCode = 2;
    return;
  }

  const report = buildDoctorReport(process.env, profile, process.cwd());
  if (json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
  if (strict && !report.ready) process.exitCode = 1;
}

const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (entry === resolve(fileURLToPath(import.meta.url))) main();
