import { expect, test } from "@playwright/test";

const E2E_PASSWORD = "kv-e2e-password";

test("real login form rejects an invalid password", async ({ page }) => {
  await page.goto("/login");

  await page.getByPlaceholder("請輸入密碼").fill("wrong-password");
  await page.getByRole("button", { name: "登入" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("密碼錯誤", { exact: true })).toBeVisible();
});

test("real login form creates and clears a protected session", async ({ page }) => {
  await page.goto("/login");

  await page.getByPlaceholder("請輸入密碼").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "登入" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "團隊總覽" })).toBeVisible();

  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "登出" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
