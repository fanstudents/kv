import { describe, expect, it } from "vitest";
import { projectVisitLegacyLiveTask } from "@/modules/visit/projection";
import type { VisitState } from "@/modules/visit/domain";

describe("Visit legacy live-task projection", () => {
  it.each([
    [{ status: "idle" }, null],
    [{ status: "parsing_card", runId: "run-1" }, { nodeId: "scan", step: 0, status: "active" }],
    [
      { status: "waiting_visit_decision", offerId: "offer-1" },
      { nodeId: "confirm", step: 2, status: "waiting" },
    ],
    [{ status: "preparing_invite" }, { nodeId: "match", step: 2, status: "active" }],
    [
      { status: "waiting_invite_approval", inviteId: "invite-1" },
      { nodeId: "draft", step: 3, status: "active" },
    ],
    [
      { status: "delivering_invite", inviteId: "invite-1" },
      { nodeId: "draft", step: 3, status: "active" },
    ],
    [
      { status: "waiting_contact_response", inviteId: "invite-1" },
      { nodeId: "sent", step: 4, status: "done" },
    ],
    [
      { status: "waiting_location", inviteId: "invite-1", chosenSlot: "1" },
      { nodeId: "sent", step: 4, status: "done" },
    ],
    [
      { status: "fulfilling_visit", inviteId: "invite-1", chosenSlot: "both" },
      { nodeId: "sent", step: 4, status: "done" },
    ],
  ] satisfies Array<[VisitState, ReturnType<typeof projectVisitLegacyLiveTask>]>)(
    "maps %s without changing the old UI protocol",
    (state, expected) => {
      expect(projectVisitLegacyLiveTask(state)).toEqual(expected);
    }
  );

  it("preserves terminal quirks from the existing route", () => {
    expect(projectVisitLegacyLiveTask({ status: "failed", error: "unrecognized" })).toEqual({
      nodeId: "scan",
      step: 0,
      status: "active",
    });
    expect(
      projectVisitLegacyLiveTask({
        status: "succeeded",
        contact: { name: "No Email" },
      })
    ).toEqual({ nodeId: "confirm", step: 2, status: "waiting" });
    expect(projectVisitLegacyLiveTask({ status: "cancelled", offerId: "offer-1" })).toEqual({
      nodeId: "tag",
      step: 2,
      status: "done",
    });
    expect(projectVisitLegacyLiveTask({ status: "cancelled", inviteId: "invite-1" })).toEqual({
      nodeId: "draft",
      step: 3,
      status: "active",
    });
    expect(projectVisitLegacyLiveTask({ status: "failed", inviteId: "invite-1" })).toEqual({
      nodeId: "draft",
      step: 3,
      status: "active",
    });
    expect(
      projectVisitLegacyLiveTask({
        status: "failed",
        inviteId: "invite-1",
        chosenSlot: "2",
        error: "calendar timeout",
      })
    ).toEqual({ nodeId: "sent", step: 4, status: "done" });
    expect(
      projectVisitLegacyLiveTask({
        status: "succeeded",
        inviteId: "invite-1",
        chosenSlot: "1",
      })
    ).toEqual({ nodeId: "sent", step: 4, status: "done" });
  });
});
