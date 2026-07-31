import { NextRequest, NextResponse } from "next/server";
import { createSupabaseVisitLiveTaskHistoryRepository } from "@/adapters/live-task/supabase-visit-history-repository";
import {
  parseVisitLiveTaskHistoryRequest,
  readVisitLiveTaskHistory,
} from "@/modules/live-task/visit-history";

// 近期處理過的名片（真實資料）：contacts(line_card) + visit_offers / pending_invites 的結果
export async function GET(req: NextRequest) {
  const result = await readVisitLiveTaskHistory(
    parseVisitLiveTaskHistoryRequest(req.nextUrl.searchParams.get("agent")),
    createSupabaseVisitLiveTaskHistoryRepository(),
  );
  return NextResponse.json(result);
}
