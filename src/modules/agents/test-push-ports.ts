import type { AgentTestPushChannel, AgentTestPushStyle } from "./test-push-rules";

export interface AgentTestPushDelivery {
  to: string;
  text: string;
  style: AgentTestPushStyle;
  title: string;
  accentColor: string;
  channel: AgentTestPushChannel;
}

export interface AgentTestPushActivity {
  agent_slug: string;
  summary: string;
  status: "failed" | "success";
}

export interface AgentTestPushPort {
  send(delivery: AgentTestPushDelivery): Promise<void>;
  recordFailure(activity: AgentTestPushActivity): Promise<void>;
  recordSuccess(activity: AgentTestPushActivity): Promise<Record<string, unknown> | null>;
}
