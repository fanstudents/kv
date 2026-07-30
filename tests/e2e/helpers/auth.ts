import { createHmac } from "node:crypto";
import type { Page } from "@playwright/test";

const AUTH_SECRET = "kv-e2e-auth-secret";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function authenticate(page: Page) {
  const payload = Buffer.from(
    JSON.stringify({ iat: Date.now(), exp: Date.now() + THIRTY_DAYS_MS })
  ).toString("base64url");
  const signature = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");

  await page.context().addCookies([
    {
      name: "kv_session",
      value: `${payload}.${signature}`,
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
