import "server-only";
import { createLineDailyReportDelivery } from "@/adapters/reporting/line-daily-report-delivery";
import { createOpenAiDailyReportSummaryProvider } from "@/adapters/reporting/openai-daily-report-summary-provider";
import { createSupabaseSupportReportRepository } from "@/adapters/support/supabase-support-report-repository";
import { getSupabase } from "@/lib/supabase";
import { runSupportReport, SUPPORT_REPORT_SUMMARY_CONFIG } from "@/modules/support/report";

export async function runSupportDailyReport(): Promise<{ ok: boolean; message: string }> {
  return runSupportReport({
    dependencies: {
      repository: createSupabaseSupportReportRepository(getSupabase()),
      summary: createOpenAiDailyReportSummaryProvider(SUPPORT_REPORT_SUMMARY_CONFIG),
      delivery: createLineDailyReportDelivery(),
    },
    clock: {
      nowMs: () => Date.now(),
      nowDate: () => new Date(),
    },
  });
}
