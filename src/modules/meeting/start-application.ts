import type { MeetingStartPort } from "./start-ports";
import type { MeetingStartRequest } from "./start-rules";

export type MeetingStartResult =
  | { kind: "created"; id: string }
  | { kind: "create-failed" };

export async function runMeetingStart(
  input: MeetingStartRequest,
  port: MeetingStartPort
): Promise<MeetingStartResult> {
  const id = await port.create(input.title);
  return id ? { kind: "created", id } : { kind: "create-failed" };
}
