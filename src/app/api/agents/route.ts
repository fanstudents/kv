import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { AGENTS } from "@/lib/agent-data";
import type { AgentSlug } from "@/lib/types";

// 每位 Agent 目前「有沒有啟用」——以資料庫（line_agents.enabled）為準。
//
// 在這之前有兩套狀態：agent-data.ts 的 AGENTS[].status 是寫死的常數，
// line_agents.enabled 才是後台開關真正寫入的地方。側欄那顆綠燈、劇院模式的
// 「值勤中」數字都讀常數，所以你在 Agent 頁面按下停用，畫面其他地方毫無反應。
export async function GET() {
  const enabled: Record<string, boolean> = {};
  try {
    const { data } = await getSupabase().from("line_agents").select("slug,enabled");
    for (const row of data ?? []) enabled[row.slug as string] = Boolean(row.enabled);
  } catch {
    // 讀不到就退回常數裡的狀態，畫面不會空白
  }
  for (const agent of AGENTS) {
    if (!(agent.slug in enabled)) enabled[agent.slug] = agent.status === "active";
  }
  return NextResponse.json({ enabled: enabled as Record<AgentSlug, boolean> });
}
