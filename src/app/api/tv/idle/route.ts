import { NextRequest, NextResponse } from "next/server";
import { listWeekOverview, type WeekOverview } from "@/lib/google";
import { getAvailableTags } from "@/lib/contact-tags";
import { getSupabase } from "@/lib/supabase";

// 劇院待命場景的真實資料：行程助理讀真行事曆、總管讀真團隊動態、約拜訪讀真標籤。
// 全部 best-effort：取不到就回 null，前端自動退回示意資料，畫面永不開天窗。

// 行事曆 API 有配額，加一層 10 分鐘的簡易快取（模組層，重啟即清空）
let scheduleCache: { at: number; data: WeekOverview } | null = null;
const SCHEDULE_TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get("agent") ?? "";

  try {
    if (agent === "schedule") {
      if (scheduleCache && Date.now() - scheduleCache.at < SCHEDULE_TTL) {
        return NextResponse.json({ ok: true, data: scheduleCache.data, cached: true });
      }
      const data = await listWeekOverview();
      scheduleCache = { at: Date.now(), data };
      return NextResponse.json({ ok: true, data });
    }

    if (agent === "visit") {
      const tags = await getAvailableTags(getSupabase());
      return NextResponse.json({ ok: true, data: { tags } });
    }

    if (agent === "teamlead") {
      const supabase = getSupabase();
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: rows } = await supabase
        .from("line_agent_activity")
        .select("agent_slug,status,occurred_at")
        .gte("occurred_at", cutoff)
        .order("occurred_at", { ascending: false })
        .limit(500);
      const byAgent = new Map<string, number>();
      let failed = 0;
      (rows ?? []).forEach((r: { agent_slug: string | null; status: string }) => {
        if (r.status === "failed") failed++;
        if (r.agent_slug) byAgent.set(r.agent_slug, (byAgent.get(r.agent_slug) ?? 0) + 1);
      });
      const top = [...byAgent.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([slug, count]) => ({ slug, count }));
      return NextResponse.json({
        ok: true,
        data: { total: (rows ?? []).length, failed, top },
      });
    }

    return NextResponse.json({ ok: false, error: "unknown agent" }, { status: 400 });
  } catch {
    // 任何來源失敗（如 Google 憑證未設）都回 null，讓前端用示意資料
    return NextResponse.json({ ok: false, data: null });
  }
}
