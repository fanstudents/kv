import type { OutboxRecord, RunRecord, RuntimeEventRecord } from "@/platform/runtime/contracts";
import type { OutboxRepository, RuntimeRepository } from "@/platform/runtime/repositories";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryRuntimeRepository implements RuntimeRepository {
  private readonly runs = new Map<string, RunRecord>();
  private readonly eventsByIdempotencyKey = new Map<string, RuntimeEventRecord>();

  async admit(run: RunRecord, event: RuntimeEventRecord) {
    const existingEvent = this.eventsByIdempotencyKey.get(event.envelope.idempotencyKey);
    if (existingEvent) {
      const existingRun = this.runs.get(existingEvent.runId);
      if (!existingRun) throw new Error(`Event points to missing run ${existingEvent.runId}`);
      return {
        inserted: false,
        run: clone(existingRun),
        event: clone(existingEvent),
      };
    }
    if (this.runs.has(run.id)) throw new Error(`Run ${run.id} already exists`);

    // Both records are published in the same synchronous critical section.
    this.runs.set(run.id, clone(run));
    this.eventsByIdempotencyKey.set(event.envelope.idempotencyKey, clone(event));
    return { inserted: true, run: clone(run), event: clone(event) };
  }

  async create(run: RunRecord): Promise<RunRecord> {
    if (this.runs.has(run.id)) throw new Error(`Run ${run.id} already exists`);
    this.runs.set(run.id, clone(run));
    return clone(run);
  }

  async get(id: string): Promise<RunRecord | null> {
    const run = this.runs.get(id);
    return run ? clone(run) : null;
  }

  async compareAndSwap(expectedVersion: number, next: RunRecord): Promise<boolean> {
    const current = this.runs.get(next.id);
    if (!current || current.stateVersion !== expectedVersion) return false;
    this.runs.set(next.id, clone(next));
    return true;
  }

  async claim(id: string, owner: string, now: string, expiresAt: string): Promise<RunRecord | null> {
    const current = this.runs.get(id);
    if (!current) return null;
    if (current.lease && current.lease.expiresAt > now && current.lease.owner !== owner) return null;

    const claimed = { ...current, lease: { owner, expiresAt } };
    this.runs.set(id, clone(claimed));
    return clone(claimed);
  }

  async listEvents(): Promise<RuntimeEventRecord[]> {
    return [...this.eventsByIdempotencyKey.values()].map(clone);
  }
}

export class InMemoryOutboxRepository implements OutboxRepository {
  private readonly byIdempotencyKey = new Map<string, OutboxRecord>();

  async enqueueUnique(record: OutboxRecord) {
    const existing = this.byIdempotencyKey.get(record.idempotencyKey);
    if (existing) return { inserted: false, record: clone(existing) };
    this.byIdempotencyKey.set(record.idempotencyKey, clone(record));
    return { inserted: true, record: clone(record) };
  }

  async claim(owner: string, now: string, expiresAt: string, limit: number): Promise<OutboxRecord[]> {
    const available = [...this.byIdempotencyKey.values()]
      .filter(
        (record) =>
          (record.state === "pending" || record.state === "retry" || record.state === "leased") &&
          record.availableAt <= now &&
          (!record.lease || record.lease.expiresAt <= now || record.lease.owner === owner)
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit);

    return available.map((record) => {
      const claimed: OutboxRecord = {
        ...record,
        state: "leased",
        lease: { owner, expiresAt },
        updatedAt: now,
      };
      this.byIdempotencyKey.set(record.idempotencyKey, clone(claimed));
      return clone(claimed);
    });
  }

  async save(record: OutboxRecord): Promise<void> {
    if (!this.byIdempotencyKey.has(record.idempotencyKey)) {
      throw new Error(`Outbox record ${record.id} does not exist`);
    }
    this.byIdempotencyKey.set(record.idempotencyKey, clone(record));
  }

  async list(): Promise<OutboxRecord[]> {
    return [...this.byIdempotencyKey.values()].map(clone);
  }
}
