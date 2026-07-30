export type ExecutionProfile =
  | "request-response"
  | "short-event"
  | "long-lived-event"
  | "scheduled-batch"
  | "realtime-session"
  | "legacy-relay";

export interface AgentRoleTemplate {
  id: string;
  version: number;
  name: string;
  responsibility: string;
  capabilityIds: string[];
}

export interface WorkflowBinding {
  workflowId: string;
  workflowVersion: number;
  triggerIds: string[];
  executionProfile: ExecutionProfile;
}

export interface AgentInstance {
  id: string;
  roleTemplateId: string;
  roleTemplateVersion: number;
  deploymentId: string;
  enabled: boolean;
  bindings: WorkflowBinding[];
}

export type WorkflowNodeKind = "activity" | "wait-input" | "wait-approval" | "end";

export interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  activityId?: string;
  next?: string;
  transitions?: Record<string, string>;
}

export interface WorkflowDefinition {
  id: string;
  version: number;
  name: string;
  entryNodeId: string;
  nodes: WorkflowNode[];
}
