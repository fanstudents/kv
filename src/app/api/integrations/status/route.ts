import { NextResponse } from "next/server";
import { getIntegrationStatus } from "@/lib/integration-status";

// 每個 Agent 頁面「串接狀態」用：真的去檢查憑證是否還活著，不是回報種子資料裡
// 手動標記的 connected/disconnected。
export async function GET() {
  const status = await getIntegrationStatus();
  return NextResponse.json(status);
}
