import {
  finalizeTeamLeadReport,
  planTeamLeadDelivery,
  prepareTeamLeadReport,
  teamLeadActivityCutoff,
} from "@/modules/reporting/daily-report";
import type { ReportingPorts } from "@/modules/reporting/ports";

export interface ReportingClock {
  nowMs(): number;
  nowDate(): Date;
}

export interface TeamLeadReportResult {
  ok: boolean;
  message: string;
}

export async function runDailyTeamLeadReport(params: {
  ports: ReportingPorts;
  clock: ReportingClock;
}): Promise<TeamLeadReportResult> {
  const { ports, clock } = params;
  const agentRow = await ports.repository.getAgentConfig();
  const deliveryPlan = planTeamLeadDelivery(agentRow);

  if (deliveryPlan.type !== "deliver") {
    return { ok: false, message: deliveryPlan.message };
  }

  const cutoff = teamLeadActivityCutoff(clock.nowMs());
  const rows = await ports.repository.listActivities(cutoff);
  const prepared = prepareTeamLeadReport(
    rows,
    clock.nowDate(),
    ports.roster.displayName
  );
  const aiSummary = prepared.rawBrief
    ? await ports.summary.summarize(prepared.rawBrief)
    : null;
  const reportText = finalizeTeamLeadReport(prepared, aiSummary);

  try {
    await ports.delivery.deliver({ ...deliveryPlan, text: reportText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "推播失敗";
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

  return {
    ok: true,
    message: `晨報已送出，彙整 ${prepared.meaningful.length} 筆團隊動態`,
  };
}
