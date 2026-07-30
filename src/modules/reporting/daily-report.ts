export type ReportingPushStyle = "text" | "flex" | "confirm" | "buttons";

export interface ReportingActivity {
  agent_slug: string | null;
  occurred_at: string;
  summary: string;
  status: "success" | "failed" | "pending";
}

export type TeamLeadDeliveryPlan =
  | { type: "disabled"; message: "總管 Agent 已停用，略過匯報" }
  | { type: "missing_recipient"; message: "尚未設定匯報對象（reportTo）" }
  | {
      type: "deliver";
      recipient: string;
      style: ReportingPushStyle;
      title: "總管 Agent・每日晨報";
      accentColor: "#475569";
    };

export interface PreparedTeamLeadReport {
  meaningful: ReportingActivity[];
  dateLabel: string;
  rawBrief: string | null;
  fallbackText: string;
}

export function planTeamLeadDelivery(
  agentRow: { enabled?: boolean | null; settings?: unknown } | null
): TeamLeadDeliveryPlan {
  if (agentRow?.enabled === false) {
    return { type: "disabled", message: "總管 Agent 已停用，略過匯報" };
  }

  const settings = (agentRow?.settings ?? {}) as Record<string, unknown>;
  const reportTo = typeof settings.reportTo === "string" ? settings.reportTo.trim() : "";
  const style = isReportingPushStyle(settings.pushStyle) ? settings.pushStyle : "flex";

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
  rows: ReportingActivity[],
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

  const bySlug = new Map<string, ReportingActivity[]>();
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

function isReportingPushStyle(value: unknown): value is ReportingPushStyle {
  return value === "text" || value === "flex" || value === "confirm" || value === "buttons";
}
