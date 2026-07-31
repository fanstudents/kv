export interface ChecklistUpdateRequest {
  itemId: string;
  done: boolean;
}

export function parseChecklistUpdateRequest(id: string, body: unknown): ChecklistUpdateRequest {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return { itemId: id, done: Boolean(input.done) };
}
