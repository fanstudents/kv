import { expect, test } from "@playwright/test";
import { APP_PAGE_SURFACES } from "../fixtures/ui-surfaces";
import { authenticate } from "./helpers/auth";

const visualSurfaces = APP_PAGE_SURFACES.filter((surface) => surface.visualBaseline);

for (const surface of visualSurfaces) {
  test(`@visual ${surface.route}`, async ({ page }) => {
    if (surface.access === "protected") await authenticate(page);

    await page.goto(surface.testPath, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(300);

    const fileName =
      surface.route === "/login"
        ? "login.png"
        : `${surface.route.replaceAll("/", "-").replaceAll("[", "").replaceAll("]", "").slice(1)}.png`;

    await expect(page).toHaveScreenshot(fileName, {
      fullPage: true,
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.001,
    });
  });
}
