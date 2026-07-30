import type {
  SupportConversation,
  SupportReportPushStyle,
} from "@/modules/support/daily-report";

export interface SupportReportAgentConfig {
  enabled?: boolean | null;
  settings?: unknown;
}

export interface SupportReportActivity {
  summary: string;
  status: "success" | "failed";
}

export interface SupportReportDelivery {
  recipient: string;
  style: SupportReportPushStyle;
  text: string;
  title: string;
  accentColor: string;
}

export interface SupportReportRepositoryPort {
  getAgentConfig(): Promise<SupportReportAgentConfig | null>;
  listCustomerMessages(cutoff: string): Promise<SupportConversation[]>;
  getDisplayNames(
    lineUserIds: string[]
  ): Promise<ReadonlyMap<string, string | null>>;
  recordActivity(activity: SupportReportActivity): Promise<void>;
}

export interface SupportReportSummaryPort {
  summarize(rawBrief: string): Promise<string | null>;
}

export interface SupportReportDeliveryPort {
  deliver(notification: SupportReportDelivery): Promise<void>;
}

export interface SupportReportPorts {
  repository: SupportReportRepositoryPort;
  summary: SupportReportSummaryPort;
  delivery: SupportReportDeliveryPort;
}
