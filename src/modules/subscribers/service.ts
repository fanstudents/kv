export type SubscriberChannel = "primary" | "support";

export interface SubscribersUpdateFields {
  tags?: string[];
  note?: string;
}

export type SubscribersUpdateRequest =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; id: string; update: SubscribersUpdateFields };

export interface SubscriberStorageResult {
  data: unknown;
  error: { message: string } | null;
}

export interface SubscribersRepository {
  list(): Promise<SubscriberStorageResult>;
  update(id: string, fields: SubscribersUpdateFields): Promise<SubscriberStorageResult>;
  touch(lineUserId: string, channel: SubscriberChannel): Promise<void>;
}

export function parseSubscribersUpdateRequest(id: string, body: unknown): SubscribersUpdateRequest {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const update: SubscribersUpdateFields = {};
  if (Array.isArray(input.tags)) {
    update.tags = input.tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim()));
  }
  if (typeof input.note === "string") update.note = input.note;
  if (Object.keys(update).length === 0) return { kind: "invalid", message: "沒有可更新的欄位" };
  return { kind: "ok", id, update };
}

export function createSubscribersService(repository: SubscribersRepository) {
  return {
    async read() {
      const { data, error } = await repository.list();
      if (error) return { kind: "error" as const, message: error.message };
      return { kind: "ok" as const, data };
    },

    async update(input: SubscribersUpdateRequest) {
      if (input.kind === "invalid") return { kind: "error" as const, message: input.message };
      const { data, error } = await repository.update(input.id, input.update);
      if (error) return { kind: "error" as const, message: error.message };
      return { kind: "ok" as const, data };
    },
  };
}
