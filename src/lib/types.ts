export type AgentSlug =
  | "teamlead"
  | "notify"
  | "report"
  | "schedule"
  | "card"
  | "expense"
  | "visit"
  | "today"
  | "competitor"
  | "operations";

export type AgentStatus = "active" | "paused" | "draft";

export interface AgentActivity {
  id: string;
  timestamp: string;
  summary: string;
  status: "success" | "failed" | "pending";
}

export interface AgentMeta {
  slug: AgentSlug;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  color: string;
  status: AgentStatus;
  metrics: { label: string; value: string; delta?: string }[];
  lastRun: string;
  recipients: number;
  personEn: string;
  personZh: string;
  role: string;
}
