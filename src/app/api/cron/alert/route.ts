import { NextRequest, NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron";
import { alertOps } from "@/lib/alerts";

// 讓外部排程器回報「我這支跑失敗了」。
//
// GitHub Actions 的 curl 失敗只會讓那個 workflow 在 GitHub 上紅一下，沒有人會收到通知——
// 晨報連續三天沒發出去，也要等老闆自己發現。各 workflow 的 failure() 步驟會打這支。
//
// 限制講清楚：如果是整個應用連不上，這支也打不進來。它擋得住的是最常見的情況
// （某支排程回 500、或執行超時），擋不住「伺服器整台掛掉」——那要靠外部 uptime
// 監控輪詢 /api/health。
export async function POST(req: NextRequest) {
  const authError = cronAuthError(req);
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const job = typeof body.job === "string" ? body.job : "未指名的排程";
  const detail = typeof body.detail === "string" ? body.detail : "沒有提供細節";

  await alertOps(`排程「${job}」在 CI 端失敗`, detail);
  return NextResponse.json({ ok: true });
}
