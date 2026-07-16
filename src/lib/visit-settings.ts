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
}

export async function getVisitAgentSettings(
  supabase: ReturnType<typeof getSupabase>
): Promise<VisitAgentSettings> {
  const { data } = await supabase.from("line_agents").select("settings").eq("slug", "visit").single();
  const s = (data?.settings ?? {}) as Record<string, unknown>;
  return {
    rangeStartDays: Number(s.rangeStartDays) || 3,
    rangeEndDays: Number(s.rangeEndDays) || 7,
    meetingDuration: Number(s.meetingDuration) || 30,
    meetingType: typeof s.meetingType === "string" && s.meetingType ? s.meetingType : "喝咖啡",
    workingHoursStart: typeof s.workingHoursStart === "string" ? s.workingHoursStart : "09:00",
    workingHoursEnd: typeof s.workingHoursEnd === "string" ? s.workingHoursEnd : "18:00",
    senderName: typeof s.senderName === "string" && s.senderName ? s.senderName : "Jason",
  };
}
