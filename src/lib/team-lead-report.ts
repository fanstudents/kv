import "server-only";
import { getSupabase } from "@/lib/supabase";
import { createLegacyReportingAdapters } from "@/adapters/reporting/legacy-reporting-adapters";
import { runDailyTeamLeadReport } from "@/modules/reporting/application";

export async function runTeamLeadReport(): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabase();
  const ports = createLegacyReportingAdapters(supabase);
  return runDailyTeamLeadReport({
    ports,
    clock: {
      nowMs: () => Date.now(),
      nowDate: () => new Date(),
    },
  });
}
