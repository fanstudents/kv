export type {
  AgentInstance,
  AgentRoleTemplate,
  ExecutionProfile,
  WorkflowBinding,
} from "@/modules/agents/identity";

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
