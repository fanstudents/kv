#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const GENERATED_TYPES_PATH = join("src", "lib", "database.types.ts");

/**
 * Keep generator formatting differences that are not schema semantics out of
 * the checked-in snapshot. The complete normalized body remains compared by
 * schema:types:check, so generated type drift still fails the gate.
 */
export function normalizeGeneratedTypes(output) {
  return output.replace(/\r\n?/g, "\n").replace(/\n*$/, "\n");
}

export function generateSchemaTypes(cwd = process.cwd()) {
  const cli = join(cwd, "node_modules", "supabase", "dist", "supabase.js");
  if (!existsSync(cli)) {
    throw new Error("Pinned Supabase CLI is not installed; run npm ci");
  }

  const result = spawnSync(
    process.execPath,
    [cli, "gen", "types", "typescript", "--local", "--schema", "public"],
    {
      cwd,
      encoding: "utf8",
      shell: false,
      stdio: ["inherit", "pipe", "inherit"],
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Supabase CLI failed with exit code ${result.status ?? "unknown"}`);
  }

  const output = result.stdout ?? "";
  if (output.length === 0) throw new Error("Supabase CLI returned no generated types");

  writeFileSync(join(cwd, GENERATED_TYPES_PATH), normalizeGeneratedTypes(output), "utf8");
}

const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (entry === resolve(fileURLToPath(import.meta.url))) {
  try {
    generateSchemaTypes();
  } catch (error) {
    console.error(`Schema type generation blocked: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
