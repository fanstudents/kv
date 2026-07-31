import "server-only";
import { createLineDailyReportDelivery } from "@/adapters/reporting/line-daily-report-delivery";
import { createOpenAiDailyReportSummaryProvider } from "@/adapters/reporting/openai-daily-report-summary-provider";
import { createSupabaseTeamLeadReportRepository } from "@/adapters/reporting/supabase-team-lead-report-repository";
import { AGENTS } from "@/lib/agent-data";
import { getSupabase } from "@/lib/supabase";
import {
  runDailyTeamLeadReport,
  TEAM_LEAD_REPORT_SUMMARY_CONFIG,
} from "@/modules/reporting/team-lead";

export async function runTeamLeadReport(): Promise<{ ok: boolean; message: string }> {
  return runDailyTeamLeadReport({
    dependencies: {
      repository: createSupabaseTeamLeadReportRepository(getSupabase()),
      summary: createOpenAiDailyReportSummaryProvider(TEAM_LEAD_REPORT_SUMMARY_CONFIG),
      delivery: createLineDailyReportDelivery(),
      displayName(slug) {
        const agent = AGENTS.find((candidate) => candidate.slug === slug);
        return agent ? `${agent.personZh}（${agent.name}）` : slug;
      },
    },
    clock: {
      nowMs: () => Date.now(),
      nowDate: () => new Date(),
    },
  });
}
