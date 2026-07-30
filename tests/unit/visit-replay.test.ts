import { describe, expect, it } from "vitest";
import { replayVisit } from "@/modules/visit/replay";
import { VISIT_PARITY_SCENARIOS } from "../fixtures/visit-scenarios";

describe("Visit characterization replay", () => {
  it.each(VISIT_PARITY_SCENARIOS)("$id", (scenario) => {
    const replay = replayVisit({ status: "idle" }, scenario.events);

    expect(replay.frames.map(({ decision }) => decision.state.status)).toEqual(
      scenario.expectedStatuses
    );
    expect(
      replay.frames.map(({ decision }) => decision.intents.map(({ type }) => type))
    ).toEqual(scenario.expectedIntentTypes);
    expect(replay.frames.map(({ legacyProjection }) => legacyProjection)).toEqual(
      scenario.expectedLegacyProjections
    );
    expect(scenario.legacyEvidence.length).toBeGreaterThan(0);
  });
});
