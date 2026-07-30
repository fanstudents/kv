import { expect, test } from "@playwright/test";
import { API_SURFACES } from "../fixtures/api-surfaces";

function concretePath(route: string): string {
  return route.replace("[slug]", "visit").replace("[id]", "fixture-id");
}

for (const surface of API_SURFACES.filter((item) => item.access === "session")) {
  for (const method of surface.methods) {
    test(`${method} ${surface.route} rejects an anonymous request`, async ({ request }) => {
      const response = await request.fetch(concretePath(surface.route), { method });

      expect(response.status()).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
    });
  }
}
