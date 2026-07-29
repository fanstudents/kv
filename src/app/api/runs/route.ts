import { NextRequest, NextResponse } from "next/server";
import { listAllRuns, type RunStatus } from "@/lib/agent-runs";

// 執行紀錄列表。這些資料一直在寫，但在這支之前後台沒有任何一頁讀得到。
export const dynamic = "force-dynamic";

const STATUSES: RunStatus[] = ["running", "success", "failed", "waiting", "cancelled"];

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const agentSlug = params.get("agent") ?? undefined;
  const statusParam = params.get("status");
  const status = STATUSES.includes(statusParam as RunStatus) ? (statusParam as RunStatus) : undefined;
  const limit = Math.min(Number(params.get("limit")) || 50, 200);

  const runs = await listAllRuns({ agentSlug, status, limit });
  return NextResponse.json({ runs });
}
