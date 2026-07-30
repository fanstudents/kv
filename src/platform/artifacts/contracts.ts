export interface Artifact<TContent = unknown> {
  id: string;
  runId: string;
  agentInstanceId: string;
  kind: string;
  title: string;
  version: number;
  content: TContent;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface DeliveryRequest<TPayload = unknown> {
  channel: string;
  destination: string;
  payload: TPayload;
  artifactIds: string[];
}
