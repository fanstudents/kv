import type { AgentActivity } from "@/lib/types";

type ActivityApiRow = {
  id?: unknown;
  occurred_at?: unknown;
  summary?: unknown;
  status?: unknown;
};

const ACTIVITY_STATUSES = new Set<AgentActivity["status"]>(["success", "failed", "pending"]);

export function mapAgentActivityRows(rows: unknown): AgentActivity[] | null {
  if (!Array.isArray(rows)) return null;

  return rows.filter(isActivityApiRow).map((row, index) => ({
    id: typeof row.id === "string" && row.id ? row.id : `activity-${index}`,
    timestamp: formatActivityTimestamp(row.occurred_at),
    summary: typeof row.summary === "string" ? row.summary : "（沒有提供執行摘要）",
    status: isActivityStatus(row.status) ? row.status : "pending",
  }));
}

export function createAgentFailureActivity(id: string, summary: string): AgentActivity {
  return {
    id,
    timestamp: new Date().toLocaleString("zh-TW"),
    summary,
    status: "failed",
  };
}

export async function readAgentApiResponse(response: Response, fallbackMessage: string): Promise<unknown> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === "string" ? payload.error : fallbackMessage;
    throw new Error(message);
  }
  return payload;
}

function isActivityApiRow(value: unknown): value is ActivityApiRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isActivityStatus(value: unknown): value is AgentActivity["status"] {
  return typeof value === "string" && ACTIVITY_STATUSES.has(value as AgentActivity["status"]);
}

function formatActivityTimestamp(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    return "時間未知";
  }
  return new Date(value).toLocaleString("zh-TW");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
