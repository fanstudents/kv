import { NextRequest } from "next/server";
import { getSearchOverview } from "@/lib/gsc";
import { parseOverviewDays, readOverview } from "@/app/api/agents/overview-response";

// SEO 助理（Leo）用：真實 Search Console 成效，?days= 選擇統計區間（預設 7 天）。
export async function GET(req: NextRequest) {
  const days = parseOverviewDays(req.nextUrl.searchParams.get("days"));
  return readOverview(() => getSearchOverview(days));
}
