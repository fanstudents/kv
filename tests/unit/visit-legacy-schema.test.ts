import { describe, expect, it } from "vitest";
import {
  fromLegacyContactRow,
  fromLegacyVisitSnapshot,
  toLegacyContactInsert,
  toLegacyPendingInviteInsert,
  toLegacyVisitOfferInsert,
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
