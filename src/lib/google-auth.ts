import "server-only";
import { google } from "googleapis";

// 共用的 Google OAuth client：行事曆／Gmail／Search Console／GA4 都掛在同一組
// refresh token 下（同一次授權涵蓋所有需要的權限範圍），避免每個 lib 各自重複這段設定。
export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN environment variables");
  }
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
