import "server-only";
import { getSupabase } from "@/lib/supabase";
import { createLegacySupportReportAdapters } from "@/adapters/support/legacy-support-report-adapters";
import {
  finalizeSupportReport,
  planSupportReportDelivery,
  prepareSupportReport,
  supportCustomerIds,
  supportReportCutoff,
} from "@/modules/support/daily-report";

export async function runSupportDailyReport(): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabase();
  const ports = createLegacySupportReportAdapters(supabase);

  const agentRow = await ports.repository.getAgentConfig();
  const deliveryPlan = planSupportReportDelivery(agentRow);
  if (deliveryPlan.type !== "deliver") {
    return { ok: false, message: deliveryPlan.message };
  }

  const cutoff = supportReportCutoff(Date.now());
  const messages = await ports.repository.listCustomerMessages(cutoff);
  let displayNames: ReadonlyMap<string, string | null> = new Map();
  if (messages.length > 0) {
    const uniqueIds = supportCustomerIds(messages);
    displayNames = await ports.repository.getDisplayNames(uniqueIds);
  }

  const prepared = prepareSupportReport(messages, displayNames, new Date());
  const aiSummary = prepared.rawBrief
    ? await ports.summary.summarize(prepared.rawBrief)
    : null;
  const reportText = finalizeSupportReport(prepared, aiSummary);

  try {
    await ports.delivery.deliver({ ...deliveryPlan, text: reportText });
  } catch (err) {
    const message = err instanceof Error ? err.message : "推播失敗";
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
