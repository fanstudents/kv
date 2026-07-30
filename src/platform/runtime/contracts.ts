import type { DeliveryRequest } from "@/platform/artifacts/contracts";
import type { EventEnvelope } from "@/platform/events/contracts";

export type RunState =
  | "queued"
  | "running"
  | "waiting_input"
  | "waiting_approval"
  | "retrying"
  | "succeeded"
  | "failed"
  | "cancelled";

export type ErrorKind = "external" | "data" | "model" | "timeout" | "cancelled" | "unknown";

export interface RunError {
  kind: ErrorKind;
  message: string;
  retryable: boolean;
}

export interface Lease {
  owner: string;
  expiresAt: string;
}

export interface RunRecord {
  id: string;
  workflowId: string;
  workflowVersion: number;
  agentInstanceId: string;
  deploymentId: string;
  correlationId: string;
  idempotencyKey: string;
  state: RunState;
  stateVersion: number;
  createdAt: string;
  updatedAt: string;
  lease?: Lease;
  output?: unknown;
  error?: RunError;
}

export interface RunTransition {
  to: RunState;
  expectedVersion: number;
  at: string;
  output?: unknown;
  error?: RunError;
}

export interface RuntimeEventRecord {
  envelope: EventEnvelope;
  runId: string;
}

export type OutboxState = "pending" | "leased" | "retry" | "delivered" | "dead_letter";

export interface OutboxRecord {
  id: string;
  runId: string;
  idempotencyKey: string;
  request: DeliveryRequest;
  state: OutboxState;
  attempt: number;
  availableAt: string;
  createdAt: string;
  updatedAt: string;
  lease?: Lease;
  lastError?: string;
}
