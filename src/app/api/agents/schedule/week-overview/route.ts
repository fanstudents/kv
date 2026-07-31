import { listWeekOverview } from "@/lib/google";
import { readOverview } from "@/app/api/agents/overview-response";

// 行程助理(Milo)用：真實 Google 行事曆未來七天總覽。
export async function GET() {
  return readOverview(listWeekOverview);
}
