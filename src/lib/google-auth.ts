import "server-only";
import { google } from "googleapis";

// 共用的 Google OAuth client：行事曆／Gmail／Search Console／GA4 都掛在同一組
// refresh token 下（同一次授權涵蓋所有需要的權限範圍），避免每個 lib 各自重複這段設定。
// 這裡把 client 快取在模組層級、只建立一次——如果每次呼叫都 new 一個新的 OAuth2 client，
// 等於每次都要拿 refresh token 重新跟 Google 換一次 access token；多個真實數據面板
// （GSC／GA4／行事曆）同時載入時很容易同時觸發好幾次換token，曾經在短時間內密集測試時
// 觀察到偶發的空/異常回應，換 token 的次數降到最低可以大幅降低這種情況發生的機會。
let cachedClient: InstanceType<typeof google.auth.OAuth2> | null = null;

export function getGoogleOAuthClient() {
  if (cachedClient) return cachedClient;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN environment variables");
  }
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  cachedClient = client;
  return client;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
