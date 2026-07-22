// 拿到新的 GOOGLE_REFRESH_TOKEN（含 GSC / GA4 權限）之後，本機執行一次即可：
// 列出這個帳號有權限的 Search Console 網站財產、GA4 屬性，方便直接挑正確的代碼
// 填進 .env.local（GSC_SITE_URL / GA4_PROPERTY_ID），不用自己去後台一個個對照。
// 用法：GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy GOOGLE_REFRESH_TOKEN=zzz node scripts/list-google-properties.mjs
import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

if (!clientId || !clientSecret || !refreshToken) {
  console.error(
    "請先設定 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN 環境變數（用重新授權後拿到的新 refresh token）。"
  );
  process.exit(1);
}

const auth = new google.auth.OAuth2(clientId, clientSecret);
auth.setCredentials({ refresh_token: refreshToken });

async function listSearchConsoleSites() {
  console.log("\n=== Search Console 網站財產 ===");
  try {
    const webmasters = google.webmasters({ version: "v3", auth });
    const { data } = await webmasters.sites.list();
    const sites = data.siteEntry ?? [];
    if (sites.length === 0) {
      console.log("這個帳號目前沒有任何 Search Console 網站財產的權限。");
      return;
    }
    sites.forEach((s) => {
      console.log(`- ${s.siteUrl}　（權限等級：${s.permissionLevel}）`);
    });
    console.log("\n把要用的那個 siteUrl 填進 .env.local 的 GSC_SITE_URL。");
  } catch (err) {
    console.error("讀取 Search Console 網站清單失敗：", err instanceof Error ? err.message : err);
  }
}

async function listGa4Properties() {
  console.log("\n=== GA4 帳號與屬性 ===");
  try {
    const analyticsadmin = google.analyticsadmin({ version: "v1beta", auth });
    const { data } = await analyticsadmin.accountSummaries.list({ pageSize: 200 });
    const accounts = data.accountSummaries ?? [];
    if (accounts.length === 0) {
      console.log("這個帳號目前沒有任何 GA4 帳號／屬性的權限。");
      return;
    }
    accounts.forEach((acc) => {
      console.log(`帳號：${acc.displayName}`);
      (acc.propertySummaries ?? []).forEach((p) => {
        // p.property 格式是 "properties/123456789"，取後半段數字才是 Property ID
        const propertyId = (p.property ?? "").replace("properties/", "");
        console.log(`  - ${p.displayName}　Property ID: ${propertyId}`);
      });
    });
    console.log("\n把要用的那個 Property ID（純數字）填進 .env.local 的 GA4_PROPERTY_ID。");
  } catch (err) {
    console.error("讀取 GA4 屬性清單失敗：", err instanceof Error ? err.message : err);
  }
}

await listSearchConsoleSites();
await listGa4Properties();
