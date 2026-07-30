import { describe, expect, it } from "vitest";
import { evaluateVisitEvent } from "@/modules/visit/application";
import {
  InvalidVisitFlowModeError,
  parseVisitFlowMode,
  planVisitFlow,
} from "@/modules/visit/mode";

describe("Visit flow mode", () => {
  it("defaults to legacy and rejects configuration typos", () => {
    expect(parseVisitFlowMode(undefined)).toBe("legacy");
    expect(parseVisitFlowMode("")).toBe("legacy");
    expect(parseVisitFlowMode(" SHADOW ")).toBe("shadow");
    expect(() => parseVisitFlowMode("shdaow")).toThrow(InvalidVisitFlowModeError);
  });

  it("keeps side-effect ownership explicit for every rollout mode", () => {
    expect(planVisitFlow("legacy")).toEqual({
      mode: "legacy",
      runLegacy: true,
      evaluateNew: false,
      executeNewIntents: false,
    });
    expect(planVisitFlow("shadow")).toEqual({
      mode: "shadow",
      runLegacy: true,
      evaluateNew: true,
      executeNewIntents: false,
    });
    expect(planVisitFlow("new")).toEqual({
      mode: "new",
      runLegacy: false,
      evaluateNew: true,
      executeNewIntents: true,
    });
  });
});

describe("Visit application evaluation", () => {
  it("returns domain truth, compatibility projection, and a no-effect intent plan", async () => {
    const evaluation = await evaluateVisitEvent({
      state: { status: "idle" },
      event: { type: "card.received", runId: "run-1", messageId: "message-1" },
      eventId: "line:webhook:event-1",
    });

    expect(evaluation).toMatchObject({
      eventId: "line:webhook:event-1",
      previousState: { status: "idle" },
      decision: { state: { status: "parsing_card", runId: "run-1" } },
      legacyProjection: { nodeId: "scan", step: 0, status: "active" },
      intentPlan: [
        {
          type: "image.fetch-and-parse",
          outcome: "recorded",
        },
      ],
    });
  });
});
