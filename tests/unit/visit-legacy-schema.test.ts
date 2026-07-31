import { describe, expect, it } from "vitest";
import {
  toLegacyContactInsert,
  toLegacyPendingInviteConfirmationPatch,
  toLegacyPendingInviteFulfilmentPatch,
  toLegacyPendingInviteInsert,
  toLegacyPendingInviteRevisionPatch,
  toLegacyPendingInviteStatusPatch,
  toLegacyVisitOfferInsert,
  toLegacyVisitOfferResolution,
} from "@/modules/visit/legacy-schema";

describe("Visit legacy schema compatibility", () => {
  it("writes the LINE card contact and offer rows", () => {
    expect(
      toLegacyContactInsert(
        { name: "Casey", company: "CabLate", title: "CTO", email: "casey@example.test", phone: "123" },
        "line-1",
      ),
    ).toEqual({
      name: "Casey",
      company: "CabLate",
      title: "CTO",
      email: "casey@example.test",
      phone: "123",
      source: "line_card",
      line_user_id: "line-1",
    });
    expect(toLegacyVisitOfferInsert("line-1", undefined)).toEqual({
      line_user_id: "line-1",
      contact_id: null,
      status: "pending",
    });
  });

  it("preserves the legacy offer resolution vocabulary", () => {
    const resolvedAt = "2026-07-31T20:00:00.000Z";
    expect(toLegacyVisitOfferResolution("accepted", resolvedAt)).toEqual({ status: "accepted", resolved_at: resolvedAt });
    expect(toLegacyVisitOfferResolution("declined", resolvedAt)).toEqual({ status: "declined", resolved_at: resolvedAt });
    expect(toLegacyVisitOfferResolution("timed_out", resolvedAt)).toEqual({ status: "declined", resolved_at: resolvedAt });
  });

  it("writes the pending-invite payload and status patches", () => {
    expect(
      toLegacyPendingInviteInsert("line-1", {
        contactId: "contact-1",
        toEmail: "casey@example.test",
        subject: "Meeting invitation",
        body: "Hello Casey",
        slots: [
          { label: "Slot 1", start: "2026-08-03T01:00:00.000Z", end: "2026-08-03T02:00:00.000Z" },
          { label: "Slot 2", start: "2026-08-04T01:00:00.000Z", end: "2026-08-04T02:00:00.000Z" },
        ],
        requiresApproval: true,
      }),
    ).toMatchObject({
      line_user_id: "line-1",
      contact_id: "contact-1",
      to_email: "casey@example.test",
      subject: "Meeting invitation",
      body: "Hello Casey",
      slot1: "Slot 1",
      slot2: "Slot 2",
      status: "awaiting_approval",
    });
    expect(toLegacyPendingInviteStatusPatch("cancelled")).toEqual({ status: "cancelled" });
    expect(toLegacyPendingInviteRevisionPatch("Updated", "Updated body")).toEqual({ subject: "Updated", body: "Updated body" });
  });

  it("writes public response confirmation and fulfilment patches", () => {
    const resolvedAt = "2026-07-31T21:00:00.000Z";
    expect(toLegacyPendingInviteConfirmationPatch("both", resolvedAt)).toEqual({
      status: "confirmed",
      chosen_slot: "both",
      resolved_at: resolvedAt,
    });
    expect(toLegacyPendingInviteFulfilmentPatch("calendar-1", "Taipei")).toEqual({
      calendar_event_id: "calendar-1",
      location: "Taipei",
    });
    expect(toLegacyPendingInviteFulfilmentPatch("calendar-2", undefined)).toEqual({
      calendar_event_id: "calendar-2",
      location: null,
    });
  });
});
