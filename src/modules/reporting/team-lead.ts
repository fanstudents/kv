export type TeamLeadReportPushStyle = "text" | "flex" | "confirm" | "buttons";

export interface TeamLeadReportActivity {
  agent_slug: string | null;
  occurred_at: string;
  summary: string;
  status: "success" | "failed" | "pending";
}

export interface TeamLeadReportAgentConfig {
  enabled?: boolean | null;
  settings?: unknown;
}

export interface TeamLeadReportActivityWrite {
  summary: string;
  status: "success" | "failed";
}

export interface TeamLeadReportRepository {
  getAgentConfig(): Promise<TeamLeadReportAgentConfig | null>;
  listActivities(cutoff: string): Promise<TeamLeadReportActivity[]>;
  recordActivity(activity: TeamLeadReportActivityWrite): Promise<void>;
}

export interface TeamLeadReportSummaryProvider {
  summarize(rawBrief: string): Promise<string | null>;
}

export interface TeamLeadReportDelivery {
  deliver(notification: {
    recipient: string;
    style: TeamLeadReportPushStyle;
    text: string;
    title: string;
    accentColor: string;
  }): Promise<void>;
}

export interface TeamLeadReportDependencies {
  repository: TeamLeadReportRepository;
  summary: TeamLeadReportSummaryProvider;
  delivery: TeamLeadReportDelivery;
  displayName(slug: string): string;
}

export interface TeamLeadReportClock {
  nowMs(): number;
  nowDate(): Date;
}

export interface PreparedTeamLeadReport {
  meaningful: TeamLeadReportActivity[];
  dateLabel: string;
  rawBrief: string | null;
  fallbackText: string;
}

export type TeamLeadDeliveryPlan =
  | { type: "disabled"; message: "總管 Agent 已停用，略過匯報" }
  | { type: "missing_recipient"; message: "尚未設定匯報對象（reportTo）" }
  | {
      type: "deliver";
      recipient: string;
      style: TeamLeadReportPushStyle;
      title: "總管 Agent・每日晨報";
      accentColor: "#475569";
    };

export const TEAM_LEAD_REPORT_SUMMARY_CONFIG = {
  operation: "每日晨報摘要",
  agentSlug: "teamlead",
  systemPrompt:
    "你是 AI 團隊的大總管薇薇安，每天早上向老闆匯報。請用繁體中文，以簡潔幹練、稍帶溫度的主管口吻，" +
    "將以下團隊活動整理成一段晨報：先一句總結整體狀況，再條列每位有動作的成員做了什麼（每人一行、用成員名字開頭），" +
    "有失敗或需要老闆留意的事放最後並明確標註。全文控制在 350 字內，不要用 markdown 符號，條列用「•」開頭。",
} as const;

export function planTeamLeadDelivery(
  agentRow: TeamLeadReportAgentConfig | null
): TeamLeadDeliveryPlan {
  if (agentRow?.enabled === false) {
    return { type: "disabled", message: "總管 Agent 已停用，略過匯報" };
  }

  const settings = (agentRow?.settings ?? {}) as Record<string, unknown>;
  const reportTo = typeof settings.reportTo === "string" ? settings.reportTo.trim() : "";
  const style = isTeamLeadReportPushStyle(settings.pushStyle) ? settings.pushStyle : "flex";

  if (!reportTo) {
    return { type: "missing_recipient", message: "尚未設定匯報對象（reportTo）" };
  }

  return {
    type: "deliver",
    recipient: reportTo,
    style,
    title: "總管 Agent・每日晨報",
    accentColor: "#475569",
  };
}

export function teamLeadActivityCutoff(nowMs: number): string {
  return new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
}

export function prepareTeamLeadReport(
  rows: TeamLeadReportActivity[],
  now: Date,
  displayName: (slug: string) => string
): PreparedTeamLeadReport {
  const meaningful = rows.filter((row) => row.agent_slug && !row.summary.includes("草稿狀態"));
  const dateLabel = now.toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  if (meaningful.length === 0) {
    return {
      meaningful,
      dateLabel,
      rawBrief: null,
      fallbackText: `${dateLabel} 晨報\n\n過去 24 小時團隊沒有新的執行紀錄，各位成員待命中。有新任務進來我會隨時盯著，請老闆放心。`,
    };
  }

  const bySlug = new Map<string, TeamLeadReportActivity[]>();
  for (const row of meaningful) {
    const slug = row.agent_slug as string;
    const list = bySlug.get(slug) ?? [];
    list.push(row);
    bySlug.set(slug, list);
  }

  const successCount = meaningful.filter((row) => row.status === "success").length;
  const failedCount = meaningful.filter((row) => row.status === "failed").length;
  const lines = [`統計：完成 ${successCount} 件、失敗 ${failedCount} 件、共 ${meaningful.length} 筆動作`];

  for (const [slug, list] of bySlug) {
    lines.push(`\n${displayName(slug)}：`);
    for (const row of list.slice(0, 6)) {
      lines.push(`- [${row.status}] ${row.summary}`);
    }
  }

  const rawBrief = lines.join("\n");
  return {
    meaningful,
    dateLabel,
    rawBrief,
    fallbackText: `${dateLabel} 晨報\n\n${rawBrief}`,
  };
}

export function finalizeTeamLeadReport(
  prepared: PreparedTeamLeadReport,
  aiSummary: string | null
): string {
  if (prepared.rawBrief === null) return prepared.fallbackText;
  return `${prepared.dateLabel} 晨報\n\n${aiSummary ?? prepared.rawBrief}`;
}

export async function runDailyTeamLeadReport(params: {
  dependencies: TeamLeadReportDependencies;
  clock: TeamLeadReportClock;
}): Promise<{ ok: boolean; message: string }> {
  const { dependencies, clock } = params;
  const agentRow = await dependencies.repository.getAgentConfig();
  const deliveryPlan = planTeamLeadDelivery(agentRow);

  if (deliveryPlan.type !== "deliver") {
    return { ok: false, message: deliveryPlan.message };
  }

  const rows = await dependencies.repository.listActivities(teamLeadActivityCutoff(clock.nowMs()));
  const prepared = prepareTeamLeadReport(rows, clock.nowDate(), dependencies.displayName);
  const aiSummary = prepared.rawBrief ? await dependencies.summary.summarize(prepared.rawBrief) : null;
  const reportText = finalizeTeamLeadReport(prepared, aiSummary);

  try {
    await dependencies.delivery.deliver({ ...deliveryPlan, text: reportText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "推播失敗";
    await dependencies.repository.recordActivity({
      summary: `每日匯報推播失敗：${message}`,
      status: "failed",
    });
    return { ok: false, message };
  }

  await dependencies.repository.recordActivity({
    summary: `已向老闆送出每日晨報（彙整 ${prepared.meaningful.length} 筆團隊動態）`,
    status: "success",
  });

  return {
    ok: true,
    message: `晨報已送出，彙整 ${prepared.meaningful.length} 筆團隊動態`,
  };
}

function isTeamLeadReportPushStyle(value: unknown): value is TeamLeadReportPushStyle {
  return value === "text" || value === "flex" || value === "confirm" || value === "buttons";
}
