import { expect, test, type Route } from "@playwright/test";
import { authenticate } from "./helpers/auth";

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test("meeting start failure is shown instead of entering a phantom live state", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/meeting/start", async (route) => {
    await fulfillJson(route, { error: "meeting storage unavailable" }, 503);
  });

  await page.goto("/meeting", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "開會", exact: true }).click();

  await expect(page.getByText("meeting storage unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText("LIVE", { exact: false })).toHaveCount(0);
});

test("meeting media permission failure explains the required recovery", async ({ page }) => {
  await authenticate(page);
  await page.addInitScript(() => {
    const rejectMedia = async () => {
      throw new DOMException("Permission denied", "NotAllowedError");
    };
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = rejectMedia;
    } else {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: { getUserMedia: rejectMedia },
      });
    }
  });
  await page.route("**/api/meeting/start", async (route) => {
    await fulfillJson(route, { id: "meeting-e2e" });
  });

  await page.goto("/meeting", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "開會", exact: true }).click();

  await expect(
    page.getByText("需要鏡頭與麥克風權限才能開會，請允許授權後再試一次。", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("LIVE", { exact: false })).toHaveCount(0);
});
