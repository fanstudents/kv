import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

// 這些路徑必須維持公開（外部服務或客戶會直接呼叫），不能被登入牆擋住：
// - LINE / Teachify 的 webhook（平台主動打進來）
// - 約拜訪邀約信裡的時段確認連結（客戶點擊）
// - 每日晨報排程端點（由 CRON_SECRET 自行保護）
// - 登入頁與登入 API 本身
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth/",
  "/api/line/webhook",
  "/api/webhooks/",
  "/api/agents/visit/respond",
  "/api/cron/",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 首頁 = 公開的銷售到達頁（public/agent-team.html），後台移至 /dashboard
  if (pathname === "/" || pathname === "/agent-team.html") {
    return NextResponse.rewrite(new URL("/agent-team.html", request.url));
  }

  if (isPublic(pathname)) {
    // 已登入者造訪登入頁 → 導回後台
    if (pathname === "/login" && verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  // 未登入：API 回 401，頁面導向登入頁
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 排除靜態資源與圖檔，其餘全部經過登入檢查
  matcher: ["/((?!_next/static|_next/image|favicon.ico|avatars/|managers/|office-.*\\.jpg).*)"],
};
