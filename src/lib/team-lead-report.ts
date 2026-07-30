import "server-only";
import { getSupabase } from "@/lib/supabase";
import { createLegacyReportingAdapters } from "@/adapters/reporting/legacy-reporting-adapters";
import {
  finalizeTeamLeadReport,
  planTeamLeadDelivery,
  prepareTeamLeadReport,
  teamLeadActivityCutoff,
} from "@/modules/reporting/daily-report";

export async function runTeamLeadReport(): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabase();
  const ports = createLegacyReportingAdapters(supabase);

  const agentRow = await ports.repository.getAgentConfig();
  const deliveryPlan = planTeamLeadDelivery(agentRow);
  if (deliveryPlan.type !== "deliver") {
    return { ok: false, message: deliveryPlan.message };
  }

  const cutoff = teamLeadActivityCutoff(Date.now());
  const rows = await ports.repository.listActivities(cutoff);
  const prepared = prepareTeamLeadReport(
    rows,
    new Date(),
    ports.roster.displayName
  );
  const aiSummary = prepared.rawBrief
    ? await ports.summary.summarize(prepared.rawBrief)
    : null;
  const reportText = finalizeTeamLeadReport(prepared, aiSummary);

  try {
    await ports.delivery.deliver({ ...deliveryPlan, text: reportText });
  } catch (err) {
    const message = err instanceof Error ? err.message : "推播失敗";
    await ports.repository.recordActivity({
      summary: `每日匯報推播失敗：${message}`,
      status: "failed",
    });
    return { ok: false, message };
  }

  await ports.repository.recordActivity({
    summary: `已向老闆送出每日晨報（彙整 ${prepared.meaningful.length} 筆團隊動態）`,
    status: "success",
  });

  return { ok: true, message: `晨報已送出，彙整 ${prepared.meaningful.length} 筆團隊動態` };
}
