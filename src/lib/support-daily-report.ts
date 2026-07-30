import "server-only";
import { getSupabase } from "@/lib/supabase";
import { createLegacySupportReportAdapters } from "@/adapters/support/legacy-support-report-adapters";
import { runSupportReport } from "@/modules/support/reporting-application";

export async function runSupportDailyReport(): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabase();
  const ports = createLegacySupportReportAdapters(supabase);
  return runSupportReport({
    ports,
    clock: {
      nowMs: () => Date.now(),
      nowDate: () => new Date(),
    },
  });
}
