import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// The schema job is mandatory. This list only describes changes that cannot
// alter migrations, generated database types, or the schema rehearsal toolchain.
// Anything not listed here deliberately falls back to the full schema gate.
const SCHEMA_EXEMPTIONS = [
  /^README(?:\.[^/]+)?$/i,
  /^CHANGELOG(?:\.[^/]+)?$/i,
  /^docs\//i,
  /^public\//i,
  /^src\/(?:app|components|modules|adapters)\//i,
  /^src\/lib\/(?!database\.types\.ts$)/i,
  /^tests\/unit\/(?!database-surface-inventory\.test\.ts$)/i,
  /^tests\/(?:e2e|acceptance)\//i,
  /^Dockerfile$/i,
  /^\.dockerignore$/i,
  /^next\.config\.[cm]?[jt]s$/i,
  /^eslint\.config\.[cm]?[jt]s$/i,
  /^playwright\.config\.[cm]?[jt]s$/i,
  /^vitest\.[cm]?[jt]s$/i,
  /^tsconfig(?:\.[^/]+)?\.json$/i,
  /^\.github\/workflows\/(?:daily-support-report|daily-team-lead-report|scheduled-jobs)\.yml$/i,
];

// Only reader-facing documentation can skip the expensive quality pipeline.
// Everything else—including workflow, dependency, source, test, generated,
// configuration, and unknown paths—deliberately falls back to the full gate.
const QUALITY_EXEMPTIONS = [
  /^README(?:\.[^/]+)?$/i,
  /^CHANGELOG(?:\.[^/]+)?$/i,
  /^docs\//i,
];

/**
 * @typedef {{ required: boolean, paths: string[], reason: string }} SchemaScopeResult
 * @typedef {{ base?: string | null, head?: string | null, paths?: string[] | null }} SchemaScopeInput
 */

function normalizePath(path) {
  return path.trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

/** @param {string[]} paths @returns {SchemaScopeResult} */
export function classifySchemaScope(paths) {
  const normalized = paths.map(normalizePath).filter(Boolean);
  if (normalized.length === 0) {
    return {
      required: true,
      paths: normalized,
      reason: "changed-file list is empty; fail closed",
    };
  }

  const unsafe = normalized.filter((path) => !SCHEMA_EXEMPTIONS.some((pattern) => pattern.test(path)));
  if (unsafe.length > 0) {
    return {
      required: true,
      paths: normalized,
      reason: `schema-sensitive or unknown paths: ${unsafe.join(", ")}`,
    };
  }

  return {
    required: false,
    paths: normalized,
    reason: "all changed paths are schema-exempt",
  };
}

/** @param {string[]} paths @returns {SchemaScopeResult} */
export function classifyQualityScope(paths) {
  const normalized = paths.map(normalizePath).filter(Boolean);
  if (normalized.length === 0) {
    return {
      required: true,
      paths: normalized,
      reason: "changed-file list is empty; fail closed",
    };
  }

  const unsafe = normalized.filter((path) => !QUALITY_EXEMPTIONS.some((pattern) => pattern.test(path)));
  if (unsafe.length > 0) {
    return {
      required: true,
      paths: normalized,
      reason: `quality-sensitive or unknown paths: ${unsafe.join(", ")}`,
    };
  }

  return {
    required: false,
    paths: normalized,
    reason: "all changed paths are documentation-only",
  };
}

function changedFiles(base, head) {
  if (!base || !head || /^0+$/.test(base)) return null;
  try {
    const output = execFileSync("git", ["diff", "--name-only", `${base}...${head}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return output.split(/\r?\n/).filter(Boolean);
  } catch {
    return null;
  }
}

/** @param {SchemaScopeInput} input @returns {SchemaScopeResult} */
export function evaluateSchemaScope({ base, head, paths = null } = {}) {
  const changed = paths ?? changedFiles(base, head);
  if (changed === null) {
    return {
      required: true,
      paths: [],
      reason: "unable to resolve the comparison range; fail closed",
    };
  }
  return classifySchemaScope(changed);
}

/** @param {SchemaScopeInput} input @returns {SchemaScopeResult} */
export function evaluateQualityScope({ base, head, paths = null } = {}) {
  const changed = paths ?? changedFiles(base, head);
  if (changed === null) {
    return {
      required: true,
      paths: [],
      reason: "unable to resolve the comparison range; fail closed",
    };
  }
  return classifyQualityScope(changed);
}

function writeGitHubOutput(schema, quality) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  appendFileSync(
    outputFile,
    `schema-required=${schema.required}\n` +
      `schema-reason=${schema.reason.replaceAll("\n", " ")}\n` +
      `quality-required=${quality.required}\n` +
      `quality-reason=${quality.reason.replaceAll("\n", " ")}\n` +
      `changed-count=${schema.paths.length}\n`,
  );
}

function main() {
  const input = {
    base: process.env.CI_SCOPE_BASE_SHA,
    head: process.env.CI_SCOPE_HEAD_SHA || process.env.GITHUB_SHA,
  };
  const schema = evaluateSchemaScope(input);
  const quality = evaluateQualityScope(input);
  writeGitHubOutput(schema, quality);
  console.log(JSON.stringify({ schema, quality }));
}

const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (entry === resolve(fileURLToPath(import.meta.url))) main();
