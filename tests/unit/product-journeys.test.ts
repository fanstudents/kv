import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { API_SURFACES } from "../fixtures/api-surfaces";
import { PRODUCT_JOURNEYS } from "../fixtures/product-journeys";

const apiRoutes = new Set(API_SURFACES.map((surface) => surface.route));

describe("product journey fixtures", () => {
  it("use unique journey and step identifiers", () => {
    expect(new Set(PRODUCT_JOURNEYS.map((journey) => journey.id)).size).toBe(PRODUCT_JOURNEYS.length);
    for (const journey of PRODUCT_JOURNEYS) {
      expect(new Set(journey.steps.map((step) => step.id)).size).toBe(journey.steps.length);
    }
  });

  it("reference inventoried APIs or existing library symbols", () => {
    for (const journey of PRODUCT_JOURNEYS) {
      for (const step of journey.steps) {
        if (step.entrypoint.startsWith("/api/")) {
          expect(apiRoutes.has(step.entrypoint), step.entrypoint).toBe(true);
          continue;
        }

        const [source, symbol] = step.entrypoint.split("#");
        expect(existsSync(join(process.cwd(), source)), source).toBe(true);
        expect(symbol, step.entrypoint).toBeTruthy();
      }
    }
  });

  it("makes every current side effect and failure contract explicit", () => {
    for (const journey of PRODUCT_JOURNEYS) {
      for (const step of journey.steps) {
        expect(step.sideEffects.length, `${journey.id}/${step.id}`).toBeGreaterThan(0);
        expect(step.failureSemantics.length, `${journey.id}/${step.id}`).toBeGreaterThan(20);
      }
    }
  });
});
