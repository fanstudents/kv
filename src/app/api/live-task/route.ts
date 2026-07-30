import { NextRequest, NextResponse } from "next/server";
import { createLegacyLiveTaskReadAdapter } from "@/adapters/live-task/legacy-read-adapter";
import { createLegacyLiveTaskUpdateAdapter } from "@/adapters/live-task/legacy-update-adapter";
import { runLiveTaskRead } from "@/modules/live-task/read-application";
import { parseLiveTaskReadRequest } from "@/modules/live-task/read-rules";
import { runLiveTaskUpdate } from "@/modules/live-task/update-application";
import { parseLiveTaskUpdateRequest } from "@/modules/live-task/update-rules";

// /tv 每 1.5 秒輪詢：回傳某 Agent 的「真實現正處理」狀態（不含圖片本體）。
//
// 進度以 agent_run_steps 為準——那是真正的執行紀錄，node_id 就是流程圖節點的 id，
// 所以畫面上亮起來的節點與資料庫裡記下來的那一步是同一個東西。
// agent_live_task 仍然負責「現正處理的照片」與兩分鐘 TTL 的活著判斷（畫面用）。
export async function GET(req: NextRequest) {
  const result = await runLiveTaskRead(
    parseLiveTaskReadRequest(req.nextUrl.searchParams.get("agent")),
    createLegacyLiveTaskReadAdapter(),
  );
  return NextResponse.json(result.kind === "inactive" ? { active: false } : result.response);
}

// 示範用觸發（登入牆保護）：展示時可手動帶動畫，或供測試不經 LINE 觸發
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await runLiveTaskUpdate(
    parseLiveTaskUpdateRequest(body),
    createLegacyLiveTaskUpdateAdapter(),
  );
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
