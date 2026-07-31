import { describe, expect, it } from "vitest";
import { parseMeetingTurnLogRequest } from "@/modules/meeting/session";
import { parseMeetingRealtimeUsageLogRequest } from "@/modules/meeting/log-usage-rules";

describe("Meeting turn-log request parsing", () => {
  it("preserves coercion, trim, and role defaults", () => {
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

  it("turns malformed fields into the established defaults", () => {
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

describe("Meeting realtime usage request parsing", () => {
  it("preserves model, optional agent slug, and object usage payloads", () => {
    const usage = { total_tokens: 4, input_token_details: { text_tokens: 3 } };
    expect(parseMeetingRealtimeUsageLogRequest({ model: "gpt-realtime-2.1", agentSlug: "report", usage })).toEqual({
      model: "gpt-realtime-2.1",
      agentSlug: "report",
      usage,
    });
  });

  it("uses empty defaults and retains any JSON-shaped usage payload", () => {
    expect(parseMeetingRealtimeUsageLogRequest(null)).toEqual({ model: "", agentSlug: undefined, usage: {} });
    expect(parseMeetingRealtimeUsageLogRequest({ model: 1, agentSlug: 2, usage: null })).toEqual({
      model: "",
      agentSlug: undefined,
      usage: {},
    });
    const usage = ["legacy", 1];
    expect(parseMeetingRealtimeUsageLogRequest({ model: "model", usage }).usage).toBe(usage);
  });
});
