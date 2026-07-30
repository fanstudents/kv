import type { OutboxRecord } from "@/platform/runtime/contracts";

export class InvalidOutboxTransitionError extends Error {}

function requireLease(record: OutboxRecord, owner: string): void {
  if (record.state !== "leased" || record.lease?.owner !== owner) {
    throw new InvalidOutboxTransitionError(`Outbox ${record.id} is not leased by ${owner}`);
  }
}

export function completeDelivery(record: OutboxRecord, owner: string, at: string): OutboxRecord {
  requireLease(record, owner);
  return {
    ...record,
    state: "delivered",
    attempt: record.attempt + 1,
    updatedAt: at,
    lease: undefined,
    lastError: undefined,
  };
}

export function failDelivery(params: {
  record: OutboxRecord;
  owner: string;
  at: string;
  retryAt: string;
  error: string;
  maxAttempts: number;
}): OutboxRecord {
  requireLease(params.record, params.owner);
  const attempt = params.record.attempt + 1;
  return {
    ...params.record,
    state: attempt >= params.maxAttempts ? "dead_letter" : "retry",
    attempt,
    availableAt: params.retryAt,
    updatedAt: params.at,
    lease: undefined,
    lastError: params.error,
  };
}
