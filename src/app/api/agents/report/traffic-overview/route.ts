import { NextRequest } from "next/server";
import { getTrafficOverview } from "@/lib/ga4";
import { parseOverviewDays, readOverview } from "@/app/api/agents/overview-response";

// 數據助理（Ivy）用：真實 GA4 流量、轉換與渠道拆分，?days= 選擇統計區間（預設 7 天）。
export async function GET(req: NextRequest) {
  const days = parseOverviewDays(req.nextUrl.searchParams.get("days"));
  return readOverview(() => getTrafficOverview(days));
}
