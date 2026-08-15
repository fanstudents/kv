import { expect, test, type Page, type Route } from "@playwright/test";
import { authenticate } from "./helpers/auth";

const ITEM_ID = "deploy-zeabur-bound";
const ITEM_TITLE = "確認 Zeabur 服務已連接 GitHub repo";

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function stubChecklist(page: Page, patchHandler: (route: Route) => Promise<void>) {
  await page.route("**/api/activity**", async (route) => fulfillJson(route, []));
  await page.route("**/api/checklist**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/checklist")) {
      return fulfillJson(route, [{ item_id: ITEM_ID, done: false }]);
    }
    return patchHandler(route);
  });
}

test("checklist toggle persists the selected item", async ({ page }) => {
  await authenticate(page);
  let savedBody: Record<string, unknown> | null = null;
  await stubChecklist(page, async (route) => {
    savedBody = route.request().postDataJSON() as Record<string, unknown>;
    return fulfillJson(route, { item_id: ITEM_ID, done: true });
  });

  await page.goto("/todos", { waitUntil: "domcontentloaded" });
  const item = page.locator("li").filter({ hasText: ITEM_TITLE }).first();
  const title = item.getByText(ITEM_TITLE, { exact: true });
  await expect(title).not.toHaveClass(/line-through/);
  await item.getByRole("button").click();

  await expect.poll(() => savedBody).not.toBeNull();
  expect(savedBody).toEqual({ done: true });
  await expect(title).toHaveClass(/line-through/);
  await expect(page.getByText(/1 \/ \d+ 已完成/)).toBeVisible();
});

test("checklist toggle rolls back when persistence fails", async ({ page }) => {
  await authenticate(page);
  let patchAttempted = false;
  await stubChecklist(page, async (route) => {
    patchAttempted = true;
    return fulfillJson(route, { error: "checklist unavailable" }, 503);
  });

  await page.goto("/todos", { waitUntil: "domcontentloaded" });
  const item = page.locator("li").filter({ hasText: ITEM_TITLE }).first();
  const title = item.getByText(ITEM_TITLE, { exact: true });
  await item.getByRole("button").click();

  await expect.poll(() => patchAttempted).toBe(true);
  await expect(title).not.toHaveClass(/line-through/);
  await expect(page.getByText(/0 \/ \d+ 已完成/)).toBeVisible();
});
