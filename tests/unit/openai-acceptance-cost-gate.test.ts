import { describe, expect, it } from "vitest";

import {
  OPENAI_ACCEPTANCE_ESTIMATED_MAX_USD,
  OPENAI_ACCEPTANCE_HARD_MAX_USD,
  assertOpenAiAcceptanceCostGate,
} from "../acceptance/openai-cost-gate";

describe("OpenAI acceptance cost gate", () => {
  it("requires explicit opt-in and an explicit per-run cost approval", () => {
    expect(() => assertOpenAiAcceptanceCostGate({})).toThrow("opt-in");
    expect(() => assertOpenAiAcceptanceCostGate({ OPENAI_ACCEPTANCE: "1" })).toThrow(
      "OPENAI_ACCEPTANCE_MAX_USD"
    );
  });

  it("rejects invalid, underfunded, and over-broad approvals before provider calls", () => {
    expect(() =>
      assertOpenAiAcceptanceCostGate({
        OPENAI_ACCEPTANCE: "1",
        OPENAI_ACCEPTANCE_MAX_USD: "not-a-number",
      })
    ).toThrow("positive US dollar amount");
    expect(() =>
      assertOpenAiAcceptanceCostGate({
        OPENAI_ACCEPTANCE: "1",
        OPENAI_ACCEPTANCE_MAX_USD: String(OPENAI_ACCEPTANCE_ESTIMATED_MAX_USD - 0.01),
      })
    ).toThrow("above the approved");
    expect(() =>
      assertOpenAiAcceptanceCostGate({
        OPENAI_ACCEPTANCE: "1",
        OPENAI_ACCEPTANCE_MAX_USD: String(OPENAI_ACCEPTANCE_HARD_MAX_USD + 0.01),
      })
    ).toThrow("hard limit");
  });

  it("returns the approved and estimated ceilings inside the narrow acceptance range", () => {
    expect(
      assertOpenAiAcceptanceCostGate({
        OPENAI_ACCEPTANCE: "1",
        OPENAI_ACCEPTANCE_MAX_USD: String(OPENAI_ACCEPTANCE_ESTIMATED_MAX_USD),
      })
    ).toEqual({
      approvedMaxUsd: OPENAI_ACCEPTANCE_ESTIMATED_MAX_USD,
      estimatedMaxUsd: OPENAI_ACCEPTANCE_ESTIMATED_MAX_USD,
    });
  });
});
