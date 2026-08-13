import { expect, test, type Page } from "@playwright/test";
import { authenticate } from "./helpers/auth";

const trafficOverview = (sessions: number) => ({
  ok: true,
  data: {
    sessions,
    activeUsers: Math.floor(sessions / 2),
    conversions: 27,
    sessionsDelta: 120,
    byChannel: [{ channel: "Organic Search", sessions: Math.floor(sessions / 2), conversions: 14 }],
    dailyTrend: [
      { date: "2026-08-13", sessions: Math.floor(sessions / 2), conversions: 13 },
      { date: "2026-08-14", sessions: Math.ceil(sessions / 2), conversions: 14 },
    ],
  },
});

async function setDemoMode(page: Page, on: boolean) {
  await page.addInitScript((enabled) => {
    localStorage.setItem("kv-demo-mode", enabled ? "1" : "0");
  }, on);
}

test("live GA4 projection follows the selected range and ignores an older response", async ({ page }) => {
  await authenticate(page);
  await setDemoMode(page, false);

  const requestedDays: number[] = [];
  await page.route("**/api/agents/report/traffic-overview?days=*", async (route) => {
    const days = Number(new URL(route.request().url()).searchParams.get("days"));
    requestedDays.push(days);
    if (days === 14) await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(trafficOverview(days === 30 ? 30_030 : days === 14 ? 14_014 : 7_007)),
    });
  });

  await page.goto("/agents/report", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "GA4 流量(近 7 天)" })).toBeVisible();
  await expect(page.getByText("7,007", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "14 天" }).click();
  await page.getByRole("button", { name: "30 天" }).click();
  await expect(page.getByText("30,030", { exact: true })).toBeVisible();
  await page.waitForTimeout(350);
  await expect(page.getByText("30,030", { exact: true })).toBeVisible();
  expect(requestedDays).toEqual(expect.arrayContaining([7, 14, 30]));
});

test("demo GA4 projection keeps the existing data and makes no provider request", async ({ page }) => {
  await authenticate(page);
  await setDemoMode(page, true);

  let providerRequests = 0;
  await page.route("**/api/agents/report/traffic-overview?days=*", async (route) => {
    providerRequests += 1;
    await route.abort();
  });

  await page.goto("/agents/report", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "GA4 流量(近 7 天)" })).toBeVisible();
  await expect(page.getByText("每日工作階段趨勢(近 7 天)")).toBeVisible();
  expect(providerRequests).toBe(0);
});

test("live GSC projection reports provider errors instead of falling back to demo data", async ({ page }) => {
  await authenticate(page);
  await setDemoMode(page, false);
  await page.route("**/api/agents/expense/seo-overview?days=*", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "provider unavailable" }),
    });
  });

  await page.goto("/agents/expense", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("GSC 真實資料讀取失敗：provider unavailable")).toBeVisible();
  await expect(page.getByText("每日點擊趨勢(近 7 天)")).toHaveCount(0);
});

test("TV detail uses the live GA4 projection when demo mode is off", async ({ page }) => {
  await authenticate(page);
  await setDemoMode(page, false);
  await page.route("**/api/agents/report/traffic-overview?days=7", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(trafficOverview(8_123)),
    });
  });

  await page.goto("/tv", { waitUntil: "domcontentloaded" });
  const skipIntro = page.getByRole("button", { name: "略過片頭" });
  if (await skipIntro.isVisible()) await skipIntro.click();
  await page.getByRole("button", { name: "值勤團隊" }).click();
  await page.getByRole("button", { name: /Ivy.*數據參謀/ }).click();

  await expect(page.getByText("GA4 流量 · 近 7 天")).toBeVisible();
  await expect(page.getByText(/^8,123/)).toBeVisible();
});
