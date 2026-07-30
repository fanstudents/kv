import type {
  ReportingActivity,
  ReportingPushStyle,
} from "@/modules/reporting/daily-report";

export interface ReportingAgentConfig {
  enabled?: boolean | null;
  settings?: unknown;
}

export interface ReportingActivityWrite {
  summary: string;
  status: "success" | "failed";
}

export interface ReportingDelivery {
  recipient: string;
  style: ReportingPushStyle;
  text: string;
  title: string;
  accentColor: string;
}

export interface ReportingRepositoryPort {
  getAgentConfig(): Promise<ReportingAgentConfig | null>;
  listActivities(cutoff: string): Promise<ReportingActivity[]>;
  recordActivity(activity: ReportingActivityWrite): Promise<void>;
}

export interface ReportingSummaryPort {
  summarize(rawBrief: string): Promise<string | null>;
}

export interface ReportingDeliveryPort {
  deliver(notification: ReportingDelivery): Promise<void>;
}

export interface ReportingRosterPort {
  displayName(slug: string): string;
}

export interface ReportingPorts {
  repository: ReportingRepositoryPort;
  summary: ReportingSummaryPort;
  delivery: ReportingDeliveryPort;
  roster: ReportingRosterPort;
}
