import { getPipelineOverview } from "@/lib/teaching-system";
import { readOverview } from "@/app/api/agents/overview-response";

// 營運助理（Morgan）用：企業內訓／公開課程／企業顧問洽詢／報價單的真實現況（來自「教學系統」專案）。
export async function GET() {
  return readOverview(getPipelineOverview);
}
