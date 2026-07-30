import { describe, expect, it } from "vitest";
import { parseMeetingTurnLogRequest } from "@/modules/meeting/log-turn-rules";
import { parseMeetingRealtimeUsageLogRequest } from "@/modules/meeting/log-usage-rules";

describe("Meeting log-turn request rules", () => {
  it("preserves the current coercion, trim, and role defaults", () => {
    expect(
      parseMeetingTurnLogRequest({
        meetingId: "meeting-1",
        role: "agent",
        content: "  hello  ",
        agentSlug: "report",
        speaker: "Ivy",
      })
    ).toEqual({
      meetingId: "meeting-1",
      role: "agent",
      content: "hello",
      agentSlug: "report",
      speaker: "Ivy",
    });
    expect(parseMeetingTurnLogRequest({ role: "invalid", content: "x" }).role).toBe("boss");
  });

  it("turns malformed or non-string fields into the existing fallback values", () => {
    expect(parseMeetingTurnLogRequest(null)).toEqual({
      meetingId: "",
      role: "boss",
      content: "",
      agentSlug: undefined,
      speaker: undefined,
    });
    expect(
      parseMeetingTurnLogRequest({ meetingId: 1, content: 2, agentSlug: null, speaker: false })
    ).toEqual({
      meetingId: "",
      role: "boss",
      content: "",
      agentSlug: undefined,
      speaker: undefined,
    });
  });
});

describe("Meeting log-usage request rules", () => {
  it("preserves model, optional agent slug, and object usage payloads", () => {
    const usage = { total_tokens: 4, input_token_details: { text_tokens: 3 } };
    expect(parseMeetingRealtimeUsageLogRequest({ model: "gpt-realtime-2.1", agentSlug: "report", usage })).toEqual({
      model: "gpt-realtime-2.1",
      agentSlug: "report",
      usage,
    });
  });

  it("uses the existing empty defaults, including for null usage", () => {
    expect(parseMeetingRealtimeUsageLogRequest(null)).toEqual({ model: "", agentSlug: undefined, usage: {} });
    expect(parseMeetingRealtimeUsageLogRequest({ model: 1, agentSlug: 2, usage: null })).toEqual({
      model: "",
      agentSlug: undefined,
      usage: {},
    });
  });

  it("keeps any JSON object payload shape, including arrays", () => {
    const usage = ["legacy", 1];
    expect(parseMeetingRealtimeUsageLogRequest({ model: "model", usage }).usage).toBe(usage);
  });
});
