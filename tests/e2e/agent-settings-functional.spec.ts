import { expect, test, type Page, type Route } from "@playwright/test";
import { authenticate } from "./helpers/auth";

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function stubAgentSurface(page: Page, patchHandler: (route: Route) => Promise<void>) {
  await page.route("**/api/activity**", async (route) => fulfillJson(route, []));
  await page.route("**/api/goals**", async (route) => {
    const request = route.request();
    if (request.method() === "GET") return fulfillJson(route, { goals: [] });
    return fulfillJson(route, { ok: true });
  });
  await page.route("**/api/integrations/status", async (route) => fulfillJson(route, {}));
  await page.route("**/api/agents/orders**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/activity")) return fulfillJson(route, []);
    if (request.method() === "GET") {
      return fulfillJson(route, {
        enabled: true,
        settings: { reportTo: "U-old", pushStyle: "text" },
      });
    }
    return patchHandler(route);
  });
}

test("agent settings save preserves the existing API contract", async ({ page }) => {
  await authenticate(page);
  let savedBody: Record<string, unknown> | null = null;
  await stubAgentSurface(page, async (route) => {
    const request = route.request();
    if (request.method() === "PATCH") {
      savedBody = request.postDataJSON() as Record<string, unknown>;
    }
    return fulfillJson(route, { enabled: true, settings: { reportTo: "U-new", pushStyle: "text" } });
  });

  await page.goto("/agents/orders", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Agent 設定/ }).click();
  await page.getByLabel("通知對象 LINE User ID").fill("U-new");
  await page.getByRole("button", { name: "儲存設定" }).click();

  await expect.poll(() => savedBody).not.toBeNull();
  expect(savedBody).toEqual({ settings: { reportTo: "U-new", pushStyle: "text" } });
  await expect(page.getByRole("button", { name: "已儲存" })).toBeVisible();
});

test("agent enable toggle rolls back when the API rejects the change", async ({ page }) => {
  await authenticate(page);
  let patchAttempted = false;
  await stubAgentSurface(page, async (route) => {
    if (route.request().method() === "PATCH") {
      patchAttempted = true;
      return fulfillJson(route, { error: "permission denied" }, 503);
    }
    return fulfillJson(route, { ok: true });
  });

  await page.goto("/agents/orders", { waitUntil: "domcontentloaded" });
  const toggle = page.getByRole("switch").first();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();

  await expect.poll(() => patchAttempted).toBe(true);
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("已啟用", { exact: true })).toBeVisible();
});
