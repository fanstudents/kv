import type { ContactsReadPort } from "./read-ports";

export type ContactsReadResult =
  | { kind: "error"; message: string }
  | { kind: "ok"; data: unknown };

export async function runContactsRead(port: ContactsReadPort): Promise<ContactsReadResult> {
  const { data, error } = await port.list();
  if (error) return { kind: "error", message: error.message };
  return { kind: "ok", data };
}
