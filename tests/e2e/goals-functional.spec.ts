import { expect, test, type Page, type Route } from "@playwright/test";
import { authenticate } from "./helpers/auth";

type GoalFixture = {
  id: string;
  agentSlug: "expense";
  metricId: "gsc-clicks";
  target: number;
  startValue: number;
  startDate: string;
  dueDate: string;
  cadence: "monthly";
  note?: string;
};

const EMPTY_GOALS = { goals: [] };

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function stubDashboardActivity(page: Page) {
  await page.route("**/api/activity**", async (route: Route) => {
    await fulfillJson(route, []);
  });
}

test("goals dialog creates a goal and preserves the API payload", async ({ page }) => {
  await authenticate(page);
  await stubDashboardActivity(page);
  let saved: GoalFixture | null = null;
  await page.route("**/api/goals**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/history")) return fulfillJson(route, { points: [] });
    if (request.method() === "GET") return fulfillJson(route, EMPTY_GOALS);
    if (request.method() === "PUT") {
      saved = JSON.parse(request.postData() ?? "{}") as GoalFixture;
      return fulfillJson(route, { ok: true });
    }
    return fulfillJson(route, { ok: true });
  });

  await page.goto("/goals", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("0 個進行中的目標", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "設定目標" }).click();
  await expect(page.getByRole("heading", { name: "為 Agent 設定目標" })).toBeVisible();

  await page.locator('input[type="number"]').first().fill("123");
  await page.getByPlaceholder("例如：先砍疲勞受眾再談加碼").fill("goals e2e");
  await page.getByRole("button", { name: "建立目標" }).click();

  await expect.poll(() => saved).not.toBeNull();
  expect(saved).toMatchObject({
    agentSlug: "expense",
    metricId: "gsc-clicks",
    target: 123,
    note: "goals e2e",
  });
  await expect(page.getByText("1 個進行中的目標", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "為 Agent 設定目標" })).toHaveCount(0);
});

test("goals save failure rolls back the optimistic card", async ({ page }) => {
  await authenticate(page);
  await stubDashboardActivity(page);
  let saveAttempted = false;
  await page.route("**/api/goals**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/history")) return fulfillJson(route, { points: [] });
    if (request.method() === "GET") return fulfillJson(route, EMPTY_GOALS);
    if (request.method() === "PUT") {
      saveAttempted = true;
      return fulfillJson(route, { error: "staging failure" }, 503);
    }
    return fulfillJson(route, { ok: true });
  });

  await page.goto("/goals", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("0 個進行中的目標", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "設定目標" }).click();
  await page.getByRole("button", { name: "建立目標" }).click();

  await expect.poll(() => saveAttempted).toBe(true);
  await expect(page.getByText("0 個進行中的目標", { exact: true })).toBeVisible();
});

test("goals delete removes the card after the API confirms", async ({ page }) => {
  await authenticate(page);
  await stubDashboardActivity(page);
  const fixture: GoalFixture = {
    id: "goal-e2e",
    agentSlug: "expense",
    metricId: "gsc-clicks",
    target: 3_000,
    startValue: 2_600,
    startDate: "2026-08-01",
    dueDate: "2026-09-30",
    cadence: "monthly",
    note: "delete fixture",
  };
  let deletedId = "";
  await page.route("**/api/goals**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/history")) return fulfillJson(route, { points: [] });
    if (request.method() === "GET") return fulfillJson(route, { goals: [fixture] });
    if (request.method() === "DELETE") {
      deletedId = url.searchParams.get("id") ?? "";
      return fulfillJson(route, { ok: true });
    }
    return fulfillJson(route, { ok: true });
  });

  await page.goto("/goals", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("1 個進行中的目標", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTitle("刪除目標").click();

  await expect.poll(() => deletedId).toBe("goal-e2e");
  await expect(page.getByText("0 個進行中的目標", { exact: true })).toBeVisible();
});
