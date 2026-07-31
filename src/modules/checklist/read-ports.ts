export interface ChecklistReadError {
  message: string;
}

export interface ChecklistReadPort {
  list(): Promise<{
    data: unknown;
    error: ChecklistReadError | null;
  }>;
}
