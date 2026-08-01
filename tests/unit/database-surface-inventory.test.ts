import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DATABASE_NON_TABLE_SURFACES, DATABASE_SURFACES } from "../fixtures/database-surfaces";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function schemaSql(): string {
  return readdirSync(join(process.cwd(), "supabase", "migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(process.cwd(), "supabase", "migrations", name), "utf8"))
    .join("\n")
    .replaceAll('"', "");
}

describe("database surface inventory", () => {
  it("classifies every literal Supabase table reference exactly once", () => {
    const actual = sourceFiles(join(process.cwd(), "src"))
      .flatMap((path) => [...readFileSync(path, "utf8").matchAll(/\.from\("([A-Za-z0-9_]+)"\)/g)])
      .map((match) => match[1])
      .filter((name) => name !== undefined)
      .sort();
    const uniqueActual = [...new Set(actual)];
    const declared = DATABASE_SURFACES.map((surface) => surface.table).sort();

    expect(new Set(declared).size).toBe(declared.length);
    expect(declared).toEqual(uniqueActual);
  });

  it("keeps schema coverage claims synchronized with SQL", () => {
    const sql = schemaSql();

    for (const surface of DATABASE_SURFACES) {
      if (surface.owner === "teaching-system") {
        expect(surface.coverage).toBe("external");
        continue;
      }

      const creates = new RegExp(
        `create table(?: if not exists)? public\\.${surface.table}\\b`,
        "i"
      ).test(sql);
      const alters = new RegExp(`alter table public\\.${surface.table}\\b`, "i").test(sql);
      const expected = creates ? "defined" : alters ? "alter-only" : "missing";
      expect(surface.coverage, surface.table).toBe(expected);
    }
  });

  it("records the acquired primary baseline and external teaching boundary", () => {
    expect(
      DATABASE_SURFACES.filter((surface) => surface.owner === "kv-primary").every(
        (surface) => surface.coverage === "defined"
      )
    ).toBe(true);
    expect(
      DATABASE_SURFACES.filter((surface) => surface.owner === "teaching-system").every(
        (surface) => surface.coverage === "external"
      )
    ).toBe(true);
    expect(DATABASE_NON_TABLE_SURFACES).toContainEqual(
      expect.objectContaining({ kind: "rpc", name: "match_kb_chunks", coverage: "defined" })
    );
  });

  it("keeps one canonical clean-environment migration before forward-only deltas", () => {
    const migrations = readdirSync(join(process.cwd(), "supabase", "migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    expect(migrations).toEqual(["20260801000000_live_baseline.sql"]);

    const baseline = readFileSync(
      join(process.cwd(), "supabase", "migrations", migrations[0]),
      "utf8"
    );
    expect(baseline.match(/^create table "public"\./gim)).toHaveLength(32);
    expect(baseline.match(/^alter table "public"\..* add constraint /gim)).toHaveLength(66);
    expect(baseline.match(/^create (?:or replace )?function /gim)).toHaveLength(6);
    expect(baseline.match(/^create policy /gim)).toHaveLength(94);
    expect(baseline.match(/^create trigger /gim)).toHaveLength(1);
  });
});
