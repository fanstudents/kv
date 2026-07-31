export interface ChecklistUpdateRequest {
  itemId: string;
  done: boolean;
}

export interface ChecklistUpdatePayload extends ChecklistUpdateRequest {
  updatedAt: string;
}

export interface ChecklistStorageResult {
  data: unknown;
  error: { message: string } | null;
}

export interface ChecklistRepository {
  list(): Promise<ChecklistStorageResult>;
  upsert(input: ChecklistUpdatePayload): Promise<ChecklistStorageResult>;
}

export function parseChecklistUpdateRequest(id: string, body: unknown): ChecklistUpdateRequest {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return { itemId: id, done: Boolean(input.done) };
}

export function createChecklistService(repository: ChecklistRepository) {
  return {
    async read() {
      const { data, error } = await repository.list();
      if (error) return { kind: "error" as const, message: error.message };
      return { kind: "ok" as const, data };
    },

    async update(input: ChecklistUpdateRequest, now: Date = new Date()) {
      const { data, error } = await repository.upsert({
        itemId: input.itemId,
        done: input.done,
        updatedAt: now.toISOString(),
      });
      if (error) return { kind: "error" as const, message: error.message };
      return { kind: "ok" as const, data };
    },
  };
}
