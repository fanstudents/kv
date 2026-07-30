import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_PAGE_SURFACES, STATIC_SURFACES } from "../fixtures/ui-surfaces";

function findFiles(directory: string, fileName: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findFiles(path, fileName);
    return entry.name === fileName ? [relative(process.cwd(), path).split(sep).join("/")] : [];
  });
}

describe("UI surface inventory", () => {
  it("classifies every App Router page exactly once", () => {
    const actual = findFiles(join(process.cwd(), "src", "app"), "page.tsx").sort();
    const declared = APP_PAGE_SURFACES.map((surface) => surface.source).sort();

    expect(new Set(declared).size).toBe(declared.length);
    expect(declared).toEqual(actual);
  });

  it("keeps route patterns and executable test paths unique", () => {
    const routes = APP_PAGE_SURFACES.map((surface) => surface.route);
    const testPaths = APP_PAGE_SURFACES.map((surface) => surface.testPath);

    expect(new Set(routes).size).toBe(routes.length);
    expect(new Set(testPaths).size).toBe(testPaths.length);
  });

  it("tracks every intentionally public static HTML artifact", () => {
    const actual = findFiles(join(process.cwd(), "public"), "agent-team.html")
      .concat(
        ["agent-config.html", "knowledge-base.html", "super-agent.html", "agent-architecture.html"].map(
          (name) => `public/${name}`
        )
      )
      .sort();
    const declared = [...new Set(STATIC_SURFACES.map((surface) => surface.source))].sort();

    expect(declared).toEqual(actual);
  });
});
