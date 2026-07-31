export interface DraftInviteEmailInput {
  contactName: string;
  contactTitle: string;
  company: string;
  meetingType: string;
  slot1: string;
  slot2: string;
  senderName: string;
}

export type DraftInviteEmailParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; input: DraftInviteEmailInput };

export type ParseBusinessCardParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; imageDataUrl: string };

function inputRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

export function parseDraftInviteEmailRequest(body: unknown): DraftInviteEmailParseResult {
  const input = inputRecord(body);
  const contactName = typeof input.contactName === "string" ? input.contactName.trim() : "";
  const contactTitle = typeof input.contactTitle === "string" ? input.contactTitle : "";
  const company = typeof input.company === "string" ? input.company : "";
  const meetingType = typeof input.meetingType === "string" ? input.meetingType : "喝咖啡";
  const slot1 = typeof input.slot1 === "string" ? input.slot1 : "";
  const slot2 = typeof input.slot2 === "string" ? input.slot2 : "";
  const senderName = typeof input.senderName === "string" ? input.senderName : "";

  if (!contactName) return { kind: "invalid", message: "缺少收件人姓名" };
  if (!slot1 || !slot2) return { kind: "invalid", message: "缺少建議時段" };

  return {
    kind: "ok",
    input: { contactName, contactTitle, company, meetingType, slot1, slot2, senderName },
  };
}

export function parseBusinessCardRequest(body: unknown): ParseBusinessCardParseResult {
  const imageDataUrl = typeof inputRecord(body).imageDataUrl === "string" ? (inputRecord(body).imageDataUrl as string) : "";
  if (!imageDataUrl.startsWith("data:image/")) return { kind: "invalid", message: "缺少有效的名片圖片" };
  return { kind: "ok", imageDataUrl };
}
