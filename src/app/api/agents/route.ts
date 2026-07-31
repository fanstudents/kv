import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/agent-data";
import { createSupabaseAgentAdminRepository } from "@/adapters/agents/supabase-agent-admin-repository";
import { readAgentStatuses } from "@/modules/agents/admin";

// 每位 Agent 目前「有沒有啟用」——以資料庫（line_agents.enabled）為準。
//
// 在這之前有兩套狀態：agent-data.ts 的 AGENTS[].status 是寫死的常數，
// line_agents.enabled 才是後台開關真正寫入的地方。側欄那顆綠燈、劇院模式的
// 「值勤中」數字都讀常數，所以你在 Agent 頁面按下停用，畫面其他地方毫無反應。
export async function GET() {
  const result = await readAgentStatuses(createSupabaseAgentAdminRepository(), AGENTS);
  return NextResponse.json(result);
}
