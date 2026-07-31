import { describe, expect, it } from "vitest";
import { parseVisitLineWebhookPayload } from "@/modules/visit/line-inbound";

describe("Visit LINE webhook payload rules", () => {
  it("keeps the raw events array and defaults a missing events field", () => {
    const event = { type: "message", replyToken: "r1", source: { userId: "U1" } };
    expect(parseVisitLineWebhookPayload(JSON.stringify({ events: [event] }))).toEqual({ kind: "valid", events: [event] });
    expect(parseVisitLineWebhookPayload(JSON.stringify({}))).toEqual({ kind: "valid", events: [] });
  });

  it("maps malformed JSON and null payloads to the existing invalid branch", () => {
    expect(parseVisitLineWebhookPayload("not-json")).toEqual({ kind: "invalid" });
    expect(parseVisitLineWebhookPayload("null")).toEqual({ kind: "invalid" });
  });
});
