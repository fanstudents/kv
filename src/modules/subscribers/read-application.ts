import type { SubscribersReadPort } from "./read-ports";

export type SubscribersReadResult =
  | { kind: "error"; message: string }
  | { kind: "ok"; data: unknown };

export async function runSubscribersRead(port: SubscribersReadPort): Promise<SubscribersReadResult> {
  const { data, error } = await port.list();
  if (error) return { kind: "error", message: error.message };
  return { kind: "ok", data };
}
