import { expect, test, type Page, type Route } from "@playwright/test";
import { authenticate } from "./helpers/auth";

const SUBSCRIBER = {
  id: "subscriber-e2e",
  line_user_id: "U1234567890abcdef",
  channel: "primary" as const,
  display_name: "小明",
  picture_url: null,
  tags: ["學員"],
  note: null,
  first_seen_at: "2026-08-01T00:00:00.000Z",
  last_seen_at: "2026-08-15T00:00:00.000Z",
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function stubSubscribers(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route("**/api/activity**", async (route) => fulfillJson(route, []));
  await page.route("**/api/subscribers**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/broadcast") && request.method() === "GET") {
      return fulfillJson(route, []);
    }
    if (url.pathname === "/api/subscribers" && request.method() === "GET") {
      return fulfillJson(route, [SUBSCRIBER]);
    }
    return handler(route);
  });
}

test("subscriber tag editing preserves the selected tags", async ({ page }) => {
  await authenticate(page);
  let updateBody: Record<string, unknown> | null = null;
  await stubSubscribers(page, async (route) => {
    updateBody = route.request().postDataJSON() as Record<string, unknown>;
    return fulfillJson(route, { ...SUBSCRIBER, tags: ["學員", "VIP"] });
  });

  await page.goto("/subscribers", { waitUntil: "domcontentloaded" });
  const row = page.locator("tr").filter({ hasText: "小明" }).first();
  await expect(row).toBeVisible();
  await row.click();
  await page
    .getByPlaceholder("輸入標籤按 Enter，例如「學員」「內部團隊」")
    .fill("VIP");
  await page.keyboard.press("Enter");

  await expect.poll(() => updateBody).not.toBeNull();
  expect(updateBody).toEqual({ tags: ["學員", "VIP"] });
  await expect(page.getByText("VIP", { exact: true }).first()).toBeVisible();
});

test("broadcast sends the selected audience and shows the provider result", async ({ page }) => {
  await authenticate(page);
  let broadcastBody: Record<string, unknown> | null = null;
  await stubSubscribers(page, async (route) => {
    if (route.request().method() === "POST") {
      broadcastBody = route.request().postDataJSON() as Record<string, unknown>;
      return fulfillJson(route, { successCount: 1, failedCount: 0 });
    }
    return fulfillJson(route, { ok: true });
  });

  await page.goto("/subscribers", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("輸入要推播的內容...").fill("內部測試公告");
  await page.getByRole("button", { name: "發送給 1 位訂閱者" }).click();

  await expect.poll(() => broadcastBody).not.toBeNull();
  expect(broadcastBody).toEqual({
    tags: [],
    channel: "all",
    style: "text",
    text: "內部測試公告",
    title: "團隊公告",
  });
  await expect(page.getByText("已送出給 1 位（失敗 0 位）", { exact: true })).toBeVisible();
});
