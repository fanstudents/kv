import { expect, test } from "@playwright/test";
import { APP_PAGE_SURFACES } from "../fixtures/ui-surfaces";
import { expectHealthySurface } from "./helpers/assert-surface";
import { authenticate } from "./helpers/auth";

const protectedPages = APP_PAGE_SURFACES.filter((surface) => surface.access === "protected");

for (const surface of protectedPages) {
  test(`anonymous ${surface.route} redirects to login`, async ({ page }) => {
    await page.goto(surface.testPath, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "原騰數位科技" })).toBeVisible();
  });

  test(`authenticated surface ${surface.route} renders`, async ({ page }) => {
    await authenticate(page);
    await expectHealthySurface(page, surface.testPath);
    await expect(page).not.toHaveURL(/\/login$/);
  });
}
