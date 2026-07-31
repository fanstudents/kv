import type { SubscribersUpdateFields } from "./update-rules";

export interface SubscribersUpdateError {
  message: string;
}

export interface SubscribersUpdatePort {
  update(id: string, fields: SubscribersUpdateFields): Promise<{
    data: unknown;
    error: SubscribersUpdateError | null;
  }>;
}
