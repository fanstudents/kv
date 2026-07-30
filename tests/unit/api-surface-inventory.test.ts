import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { API_SURFACES, PUBLIC_API_ROUTES, type ApiMethod } from "../fixtures/api-surfaces";

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findRouteFiles(path);
    return entry.name === "route.ts" ? [relative(process.cwd(), path).split(sep).join("/")] : [];
  });
}

function exportedMethods(source: string): ApiMethod[] {
  const text = readFileSync(join(process.cwd(), source), "utf8");
  return [...text.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)].map(
    (match) => match[1] as ApiMethod
  );
}

describe("API surface inventory", () => {
  it("classifies every App Router API route exactly once", () => {
    const actual = findRouteFiles(join(process.cwd(), "src", "app", "api")).sort();
    const declared = API_SURFACES.map((surface) => surface.source).sort();

    expect(new Set(declared).size).toBe(declared.length);
    expect(declared).toEqual(actual);
  });

  it("keeps API route patterns unique", () => {
    const routes = API_SURFACES.map((surface) => surface.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it.each(API_SURFACES)("$route methods match its source exports", (surface) => {
    expect(surface.methods).toEqual(exportedMethods(surface.source));
  });

  it("freezes the proxy-visible public API set", () => {
    expect(PUBLIC_API_ROUTES.sort()).toEqual(
      [
        "/api/agents/support/log-reply",
        "/api/agents/visit/respond",
        "/api/auth/login",
        "/api/auth/logout",
        "/api/cron/kb-recheck",
        "/api/cron/metric-snapshot",
        "/api/cron/support-daily-report",
        "/api/cron/team-lead-report",
        "/api/cron/visit-timeout",
        "/api/line/webhook",
        "/api/line/webhook/support",
        "/api/webhooks/teachify-order",
      ].sort()
    );
  });

  it("records at least one provider boundary for every route", () => {
    expect(API_SURFACES.every((surface) => surface.providers.length > 0)).toBe(true);
  });
});
