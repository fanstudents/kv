export interface ChecklistUpdatePayload {
  itemId: string;
  done: boolean;
  updatedAt: string;
}

export interface ChecklistUpdateError {
  message: string;
}

export interface ChecklistUpdatePort {
  upsert(input: ChecklistUpdatePayload): Promise<{
    data: unknown;
    error: ChecklistUpdateError | null;
  }>;
}
