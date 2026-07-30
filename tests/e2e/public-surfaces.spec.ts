import { expect, test } from "@playwright/test";
import { APP_PAGE_SURFACES, STATIC_SURFACES } from "../fixtures/ui-surfaces";
import { expectHealthySurface } from "./helpers/assert-surface";

const publicPages = APP_PAGE_SURFACES.filter((surface) => surface.access === "public");

for (const surface of publicPages) {
  test(`public surface ${surface.route} renders`, async ({ page }) => {
    await expectHealthySurface(page, surface.testPath);
    await expect(page).toHaveURL(new RegExp(`${surface.testPath.replaceAll("/", "\\/")}$`));
  });
}

for (const surface of STATIC_SURFACES) {
  test(`static surface ${surface.route} renders`, async ({ page }) => {
    await expectHealthySurface(page, surface.route);
  });
}
