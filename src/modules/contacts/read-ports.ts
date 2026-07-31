export interface ContactsReadError {
  message: string;
}

export interface ContactsReadPort {
  list(): Promise<{ data: unknown; error: ContactsReadError | null }>;
}
