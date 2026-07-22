// 本機執行一次即可：用你自己的 Google 帳號授權，取得長期有效的 refresh token。
// 用法：GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-google-refresh-token.mjs
import http from "node:http";
import { google } from "googleapis";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "請先設定 GOOGLE_CLIENT_ID 與 GOOGLE_CLIENT_SECRET 環境變數，再執行本腳本。\n" +
      "範例：GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-google-refresh-token.mjs"
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar",
    // SEO Agent（Leo）讀 Search Console；數據 Agent（Ivy）讀 GA4
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/analytics.readonly",
  ],
});

console.log(
  "\n請在瀏覽器打開下面這個網址，用要拿來寄信/查行事曆/讀 Search Console 與 GA4 的 Google 帳號登入並同意授權：\n" +
    "（這個帳號必須本來就對你要串接的 GSC 網站財產、GA4 資源有檢視權限，重新授權不會自動給你原本沒有的權限）\n"
);
console.log(authUrl);
console.log("\n等待授權完成中...\n");

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth2callback")) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("授權失敗，請關閉此分頁回到終端機查看錯誤訊息。");
    console.error("授權失敗：", error ?? "未收到 authorization code");
    server.close();
    process.exit(1);
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("授權成功！可以關閉此分頁，回到終端機查看 refresh token。");

    console.log("授權成功！請把下面這行加進你的 .env.local 與正式環境的環境變數：\n");
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);

    if (!tokens.refresh_token) {
      console.warn(
        "⚠️ 沒有拿到 refresh_token，通常是因為這個帳號之前已經授權過同一個應用程式。\n" +
          "請先到 https://myaccount.google.com/permissions 移除這個應用程式的授權，再重新執行一次本腳本。"
      );
    }
  } catch (err) {
    console.error("交換 token 失敗：", err instanceof Error ? err.message : err);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(PORT);
