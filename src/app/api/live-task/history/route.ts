import { NextRequest, NextResponse } from "next/server";
import { createLegacyLiveTaskHistoryAdapter } from "@/adapters/live-task/legacy-history-adapter";
import { runLiveTaskHistory } from "@/modules/live-task/history-application";
import { parseLiveTaskHistoryRequest } from "@/modules/live-task/history-rules";

// 近期處理過的名片（真實資料）：contacts(line_card) + visit_offers / pending_invites 的結果
export async function GET(req: NextRequest) {
  const result = await runLiveTaskHistory(
    parseLiveTaskHistoryRequest(req.nextUrl.searchParams.get("agent")),
    createLegacyLiveTaskHistoryAdapter(),
  );
  return NextResponse.json(result);
}
