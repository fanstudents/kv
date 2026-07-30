import { expect, type Page } from "@playwright/test";

export async function expectHealthySurface(page: Page, path: string) {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `${path} should return a document response`).not.toBeNull();
  expect(response!.status(), `${path} should not return a server error`).toBeLessThan(500);
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
  expect(pageErrors, `${path} should not emit uncaught page errors`).toEqual([]);
}
