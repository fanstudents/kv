import "server-only";
import type { getSupabase } from "@/lib/supabase";

export interface VisitAgentSettings {
  rangeStartDays: number;
  rangeEndDays: number;
  meetingDuration: number;
  meetingType: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  senderName: string;
  // 寄出邀約信前，先透過 LINE 讓使用者確認名片辨識結果與信件內容。
  // 對應後台設定頁「寄出邀約信前，先透過 LINE 讓我確認時段」開關，
  // 預設 true（安全預設值，跟後台表單的預設狀態一致）。
  requireApproval: boolean;
}

export async function getVisitAgentSettings(
  supabase: ReturnType<typeof getSupabase>
): Promise<VisitAgentSettings> {
  const { data } = await supabase.from("line_agents").select("settings").eq("slug", "visit").single();
  const s = (data?.settings ?? {}) as Record<string, unknown>;
  return {
    rangeStartDays: Number(s.rangeStartDays) || 3,
    rangeEndDays: Number(s.rangeEndDays) || 7,
    meetingDuration: Number(s.meetingDuration) || 60,
    meetingType: typeof s.meetingType === "string" && s.meetingType ? s.meetingType : "喝咖啡",
    workingHoursStart: typeof s.workingHoursStart === "string" ? s.workingHoursStart : "09:00",
    workingHoursEnd: typeof s.workingHoursEnd === "string" ? s.workingHoursEnd : "18:00",
    senderName: typeof s.senderName === "string" && s.senderName ? s.senderName : "樊松蒲 Dennis",
    requireApproval: typeof s.requireApproval === "boolean" ? s.requireApproval : true,
  };
}
