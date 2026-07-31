export interface SubscribersReadError {
  message: string;
}

export interface SubscribersReadPort {
  list(): Promise<{
    data: unknown;
    error: SubscribersReadError | null;
  }>;
}
