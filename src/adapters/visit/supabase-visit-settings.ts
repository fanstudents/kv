import "server-only";

import { getMainSupabase } from "@/lib/supabase";
import type { VisitSettings, VisitSettingsPort } from "@/modules/visit/settings-ports";

export function createSupabaseVisitSettings(): VisitSettingsPort {
  let supabase: ReturnType<typeof getMainSupabase> | null = null;

  const getClient = () => {
    if (!supabase) supabase = getMainSupabase();
    return supabase;
  };

  return {
    async get(): Promise<VisitSettings> {
      const { data } = await getClient()
        .from("line_agents")
        .select("settings")
        .eq("slug", "visit")
        .single();
      const settings = data?.settings && typeof data.settings === "object" && !Array.isArray(data.settings)
        ? data.settings
        : {};

      return {
        rangeStartDays: Number(settings.rangeStartDays) || 3,
        rangeEndDays: Number(settings.rangeEndDays) || 7,
        meetingDuration: Number(settings.meetingDuration) || 60,
        meetingType:
          typeof settings.meetingType === "string" && settings.meetingType
            ? settings.meetingType
            : "喝咖啡",
        workingHoursStart:
          typeof settings.workingHoursStart === "string"
            ? settings.workingHoursStart
            : "09:00",
        workingHoursEnd:
          typeof settings.workingHoursEnd === "string"
            ? settings.workingHoursEnd
            : "18:00",
        senderName:
          typeof settings.senderName === "string" && settings.senderName
            ? settings.senderName
            : "樊松蒲 Dennis",
        requireApproval:
          typeof settings.requireApproval === "boolean"
            ? settings.requireApproval
            : true,
      };
    },
  };
}
