export interface ContactTagPort {
  list(): Promise<string[]>;
  add(contactId: string, tag: string): Promise<string[]>;
}
