import {
  finalizeSupportReport,
  planSupportReportDelivery,
  prepareSupportReport,
  supportCustomerIds,
  supportReportCutoff,
} from "@/modules/support/daily-report";
import type { SupportReportPorts } from "@/modules/support/reporting-ports";

export interface SupportReportClock {
  nowMs(): number;
  nowDate(): Date;
}

export interface SupportDailyReportResult {
  ok: boolean;
  message: string;
}

export async function runSupportReport(params: {
  ports: SupportReportPorts;
  clock: SupportReportClock;
}): Promise<SupportDailyReportResult> {
  const { ports, clock } = params;
  const agentRow = await ports.repository.getAgentConfig();
  const deliveryPlan = planSupportReportDelivery(agentRow);

  if (deliveryPlan.type !== "deliver") {
    return { ok: false, message: deliveryPlan.message };
  }

  const cutoff = supportReportCutoff(clock.nowMs());
  const messages = await ports.repository.listCustomerMessages(cutoff);
  const displayNames =
    messages.length > 0
      ? await ports.repository.getDisplayNames(supportCustomerIds(messages))
      : new Map<string, string | null>();
  const prepared = prepareSupportReport(
    messages,
    displayNames,
    clock.nowDate()
  );
  const aiSummary = prepared.rawBrief
    ? await ports.summary.summarize(prepared.rawBrief)
    : null;
  const reportText = finalizeSupportReport(prepared, aiSummary);

  try {
    await ports.delivery.deliver({ ...deliveryPlan, text: reportText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "推播失敗";
    await ports.repository.recordActivity({
      summary: `每日客服彙報推播失敗：${message}`,
      status: "failed",
    });
    return { ok: false, message };
  }

  await ports.repository.recordActivity({
    summary: `已向老闆送出每日客服彙報（${prepared.customerCount} 位客戶、${prepared.messageCount} 則留言）`,
    status: "success",
  });

  return {
    ok: true,
    message: `客服彙報已送出（${prepared.customerCount} 位客戶、${prepared.messageCount} 則留言）`,
  };
}
