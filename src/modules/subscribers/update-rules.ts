export interface SubscribersUpdateFields {
  tags?: string[];
  note?: string;
}

export type SubscribersUpdateParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; id: string; update: SubscribersUpdateFields };

export function parseSubscribersUpdateRequest(
  id: string,
  body: unknown,
): SubscribersUpdateParseResult {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const update: SubscribersUpdateFields = {};
  if (Array.isArray(input.tags)) {
    update.tags = input.tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim()));
  }
  if (typeof input.note === "string") update.note = input.note;
  if (Object.keys(update).length === 0) return { kind: "invalid", message: "沒有可更新的欄位" };
  return { kind: "ok", id, update };
}
