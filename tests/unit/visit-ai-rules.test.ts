import { describe, expect, it } from "vitest";
import { parseBusinessCardRequest, parseDraftInviteEmailRequest } from "@/modules/visit/ai-rules";

describe("Visit AI request rules", () => {
  it("keeps draft-email defaults and validation messages", () => {
    expect(parseDraftInviteEmailRequest({ contactName: "  " })).toEqual({ kind: "invalid", message: "缺少收件人姓名" });
    expect(parseDraftInviteEmailRequest({ contactName: " Dennis ", slot1: "A", slot2: "B" })).toEqual({
      kind: "ok",
      input: {
        contactName: "Dennis",
        contactTitle: "",
        company: "",
        meetingType: "喝咖啡",
        slot1: "A",
        slot2: "B",
        senderName: "",
      },
    });
    expect(parseDraftInviteEmailRequest({ contactName: "Dennis", slot1: "A" })).toEqual({ kind: "invalid", message: "缺少建議時段" });
  });

  it("keeps the data-url prefix validation", () => {
    expect(parseBusinessCardRequest({ imageDataUrl: "https://example.com/card.png" })).toEqual({ kind: "invalid", message: "缺少有效的名片圖片" });
    expect(parseBusinessCardRequest({ imageDataUrl: "data:image/png;base64,abc" })).toEqual({ kind: "ok", imageDataUrl: "data:image/png;base64,abc" });
  });
});
