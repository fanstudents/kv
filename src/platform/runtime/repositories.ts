import type { OutboxRecord, RunRecord, RuntimeEventRecord } from "@/platform/runtime/contracts";

export interface RunRepository {
  create(run: RunRecord): Promise<RunRecord>;
  get(id: string): Promise<RunRecord | null>;
  compareAndSwap(expectedVersion: number, next: RunRecord): Promise<boolean>;
  claim(id: string, owner: string, now: string, expiresAt: string): Promise<RunRecord | null>;
}

export interface RuntimeEventRepository {
  listEvents(): Promise<RuntimeEventRecord[]>;
}

export interface RuntimeRepository extends RunRepository, RuntimeEventRepository {
  admit(
    run: RunRecord,
    event: RuntimeEventRecord
  ): Promise<{ inserted: boolean; run: RunRecord; event: RuntimeEventRecord }>;
}

export interface OutboxRepository {
  enqueueUnique(record: OutboxRecord): Promise<{ inserted: boolean; record: OutboxRecord }>;
  claim(owner: string, now: string, expiresAt: string, limit: number): Promise<OutboxRecord[]>;
  save(record: OutboxRecord): Promise<void>;
  list(): Promise<OutboxRecord[]>;
}
