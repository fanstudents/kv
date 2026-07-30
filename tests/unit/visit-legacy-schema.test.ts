import { describe, expect, it } from "vitest";
import {
  fromLegacyContactRow,
  fromLegacyVisitSnapshot,
  toLegacyContactInsert,
  toLegacyPendingInviteConfirmationPatch,
  toLegacyPendingInviteFulfilmentPatch,
  toLegacyPendingInviteInsert,
  toLegacyPendingInviteRevisionPatch,
  toLegacyPendingInviteStatusPatch,
  toLegacyVisitOfferInsert,
  toLegacyVisitOfferResolution,
  type LegacyPendingInviteRow,
} from "@/modules/visit/legacy-schema";

const contactRow = {
  id: "contact-1",
  name: "Dennis",
  company: "CabLate",
  title: null,
  email: "dennis@example.test",
  phone: null,
};

const inviteRow: LegacyPendingInviteRow = {
  id: "invite-1",
  line_user_id: "line-1",
  contact_id: "contact-1",
  to_email: "dennis@example.test",
  subject: "拜訪邀約",
  body: "您好",
  slot1: "週一",
  slot2: "週二",
  slot1_start: "2026-08-03T01:00:00.000Z",
  slot1_end: "2026-08-03T02:00:00.000Z",
  slot2_start: "2026-08-04T01:00:00.000Z",
  slot2_end: "2026-08-04T02:00:00.000Z",
  status: "pending",
};

describe("Visit legacy schema compatibility", () => {
  it("maps nullable legacy contact fields without leaking null into the domain", () => {
    expect(fromLegacyContactRow(contactRow)).toEqual({
      id: "contact-1",
      name: "Dennis",
      company: "CabLate",
      title: undefined,
      email: "dennis@example.test",
      phone: undefined,
    });
  });

  it("writes the exact contact and offer shape used by the existing LINE route", () => {
    expect(
      toLegacyContactInsert(
        { name: "", company: "", email: "dennis@example.test" },
        "line-1"
      )
    ).toEqual({
      name: "（未命名聯絡人）",
      company: null,
      title: null,
      email: "dennis@example.test",
      phone: null,
      source: "line_card",
      line_user_id: "line-1",
    });
    expect(toLegacyVisitOfferInsert("line-1", undefined)).toEqual({
      line_user_id: "line-1",
      contact_id: null,
      status: "pending",
    });
  });

  it("preserves the legacy offer status used for timeout", () => {
    const resolvedAt = "2026-07-31T20:00:00.000Z";
    expect(toLegacyVisitOfferResolution("accepted", resolvedAt)).toEqual({
      status: "accepted",
      resolved_at: resolvedAt,
    });
    expect(toLegacyVisitOfferResolution("declined", resolvedAt)).toEqual({
      status: "declined",
      resolved_at: resolvedAt,
    });
    expect(toLegacyVisitOfferResolution("timed_out", resolvedAt)).toEqual({
      status: "declined",
      resolved_at: resolvedAt,
    });
  });

  it("writes the exact pending invite shape and legacy status vocabulary", () => {
    expect(
      toLegacyPendingInviteInsert("line-1", {
        contactId: "contact-1",
        toEmail: "dennis@example.test",
        subject: "拜訪邀約",
        body: "您好",
        slots: [
          {
            label: "週一",
            start: "2026-08-03T01:00:00.000Z",
            end: "2026-08-03T02:00:00.000Z",
          },
          {
            label: "週二",
            start: "2026-08-04T01:00:00.000Z",
            end: "2026-08-04T02:00:00.000Z",
          },
        ],
        requiresApproval: true,
      })
    ).toEqual({
      line_user_id: "line-1",
      contact_id: "contact-1",
      to_email: "dennis@example.test",
      subject: "拜訪邀約",
      body: "您好",
      slot1: "週一",
      slot2: "週二",
      slot1_start: "2026-08-03T01:00:00.000Z",
      slot1_end: "2026-08-03T02:00:00.000Z",
      slot2_start: "2026-08-04T01:00:00.000Z",
      slot2_end: "2026-08-04T02:00:00.000Z",
      status: "awaiting_approval",
    });
  });

  it("writes exact LINE approval status and revision patches", () => {
    expect(toLegacyPendingInviteStatusPatch("cancelled")).toEqual({ status: "cancelled" });
    expect(toLegacyPendingInviteStatusPatch("pending")).toEqual({ status: "pending" });
    expect(toLegacyPendingInviteStatusPatch("failed")).toEqual({ status: "failed" });
    expect(toLegacyPendingInviteRevisionPatch("Updated subject", "Updated body")).toEqual({
      subject: "Updated subject",
      body: "Updated body",
    });
  });

  it("writes exact public response confirmation and fulfilment patches", () => {
    const resolvedAt = "2026-07-31T21:00:00.000Z";
    expect(toLegacyPendingInviteConfirmationPatch("both", resolvedAt)).toEqual({
      status: "confirmed",
      chosen_slot: "both",
      resolved_at: resolvedAt,
    });
    expect(toLegacyPendingInviteFulfilmentPatch("calendar-1", "台北辦公室")).toEqual({
      calendar_event_id: "calendar-1",
      location: "台北辦公室",
    });
    expect(toLegacyPendingInviteFulfilmentPatch("calendar-2", undefined)).toEqual({
      calendar_event_id: "calendar-2",
      location: null,
    });
  });

  it.each([
    ["awaiting_approval", "waiting_invite_approval"],
    ["pending", "waiting_contact_response"],
    ["cancelled", "cancelled"],
    ["failed", "failed"],
  ] as const)("rehydrates invite %s as %s", (legacyStatus, domainStatus) => {
    expect(
      fromLegacyVisitSnapshot({
        contact: contactRow,
        invite: { ...inviteRow, status: legacyStatus },
      }).status
    ).toBe(domainStatus);
  });

  it("distinguishes confirmed choice from completed calendar fulfilment", () => {
    expect(
      fromLegacyVisitSnapshot({
        contact: contactRow,
        invite: { ...inviteRow, status: "confirmed", chosen_slot: "2" },
      })
    ).toMatchObject({ status: "waiting_location", chosenSlot: "2" });
    expect(
      fromLegacyVisitSnapshot({
        contact: contactRow,
        invite: {
          ...inviteRow,
          status: "confirmed",
          chosen_slot: "2",
          calendar_event_id: "calendar-1",
        },
      }).status
    ).toBe("succeeded");
  });

  it.each([
    ["pending", "waiting_visit_decision"],
    ["accepted", "preparing_invite"],
    ["declined", "cancelled"],
  ] as const)("rehydrates offer %s as %s", (legacyStatus, domainStatus) => {
    expect(
      fromLegacyVisitSnapshot({
        contact: contactRow,
        offer: {
          id: "offer-1",
          line_user_id: "line-1",
          contact_id: "contact-1",
          status: legacyStatus,
        },
      }).status
    ).toBe(domainStatus);
  });
});
