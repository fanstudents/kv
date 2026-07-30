export interface EventSource {
  kind: "http" | "webhook" | "schedule" | "agent" | "operator" | "realtime" | "legacy";
  id: string;
}

export interface EventEnvelope<TPayload = unknown> {
  schemaVersion: "1.0";
  eventId: string;
  eventType: string;
  occurredAt: string;
  source: EventSource;
  subject?: string;
  correlationId: string;
  causationId?: string;
  idempotencyKey: string;
  payload: TPayload;
}
