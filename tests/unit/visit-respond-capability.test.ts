import { describe, expect, it, vi } from "vitest";
import type { LegacyPendingInviteRow } from "@/modules/visit/legacy-schema";
import {
  fulfilVisitPublicInvite,
  resolveVisitPublicInviteGet,
} from "@/modules/visit/respond";
import type {
  VisitRespondFulfilmentSource,
  VisitRespondFulfilmentRow,
  VisitRespondReadSource,
} from "@/modules/visit/respond-contracts";

function invite(overrides: Partial<LegacyPendingInviteRow> = {}): LegacyPendingInviteRow {
  return {
    id: "invite-1",
    line_user_id: "U123",
    contact_id: "contact-1",
    to_email: "dennis@example.test",
    subject: "邀約",
    body: "body",
    slot1: "週一上午",
    slot2: "週二下午",
    slot1_start: "2026-08-03T01:00:00.000Z",
    slot1_end: "2026-08-03T02:00:00.000Z",
    slot2_start: "2026-08-04T06:00:00.000Z",
    slot2_end: "2026-08-04T07:00:00.000Z",
    status: "pending",
    ...overrides,
  };
}

function fulfilmentRow(
  overrides: Partial<VisitRespondFulfilmentRow> = {}
): VisitRespondFulfilmentRow {
  return {
    ...invite({ status: "confirmed", chosen_slot: "1" }),
    contacts: { name: "Dennis", company: "CabLate", title: "Founder" },
    ...overrides,
  };
}

function createReadSource() {
  const source = {
    findInvite: vi.fn(),
    confirmInvite: vi.fn(),
    refetchInvite: vi.fn(),
    findInviteForFulfilment: vi.fn(),
  } satisfies VisitRespondReadSource;
  return source;
}

function createFulfilmentSource(options?: { calendarError?: unknown }) {
  const calls: string[] = [];
  const source: VisitRespondFulfilmentSource = {
    getSettings: vi.fn(async () => {
      calls.push("settings");
      return {
        rangeStartDays: 3,
        rangeEndDays: 7,
        meetingDuration: 60,
        meetingType: "喝咖啡",
        workingHoursStart: "09:00",
        workingHoursEnd: "18:00",
        senderName: "Dennis",
        requireApproval: true,
      };
    }),
    createCalendarEvent: vi.fn(async () => {
      calls.push("calendar");
      if (options?.calendarError !== undefined) throw options.calendarError;
      return "event-1";
    }),
    updateInviteFulfilled: vi.fn(async () => {
      calls.push("fulfilled");
    }),
    sendThankYouEmail: vi.fn(async () => {
      calls.push("email");
    }),
    pushLineMessage: vi.fn(async () => {
      calls.push("line");
    }),
    recordActivity: vi.fn(async () => {
      calls.push("activity");
    }),
    markInviteFailed: vi.fn(async () => {
      calls.push("failed");
    }),
    researchContact: vi.fn(),
  };
  return { calls, source };
}

describe("Visit public invite response capability", () => {
  it("returns the existing invalid-link page without reading when invite is missing", async () => {
    const read = createReadSource();

    await expect(
      resolveVisitPublicInviteGet({
        inviteId: null,
        choiceValue: "1",
        read,
        nowIso: () => "2026-07-31T00:00:00.000Z",
      })
    ).resolves.toEqual({
      kind: "message",
      title: "連結無效",
      message: "這個邀約連結不完整，請直接聯繫對方確認時間。",
      tone: "error",
    });
    expect(read.findInvite).not.toHaveBeenCalled();
  });

  it("claims a pending invite with the original choice and returns the location form", async () => {
    const read = createReadSource();
    read.findInvite.mockResolvedValue(invite());
    read.confirmInvite.mockResolvedValue(invite({ status: "confirmed", chosen_slot: "2" }));

    await expect(
      resolveVisitPublicInviteGet({
        inviteId: "invite-1",
        choiceValue: "2",
        read,
        nowIso: () => "2026-07-31T00:00:00.000Z",
      })
    ).resolves.toEqual({
      kind: "location-form",
      inviteId: "invite-1",
      chosenLabel: "週二下午",
    });
    expect(read.confirmInvite).toHaveBeenCalledWith("invite-1", "2", "2026-07-31T00:00:00.000Z");
    expect(read.refetchInvite).not.toHaveBeenCalled();
  });

  it("refetches after a lost optimistic claim and preserves the already-confirmed page", async () => {
    const read = createReadSource();
    read.findInvite.mockResolvedValue(invite());
    read.confirmInvite.mockResolvedValue(null);
    read.refetchInvite.mockResolvedValue(
      invite({ status: "confirmed", chosen_slot: "1", calendar_event_id: "event-1" })
    );

    await expect(
      resolveVisitPublicInviteGet({
        inviteId: "invite-1",
        choiceValue: "1",
        read,
        nowIso: () => "2026-07-31T00:00:00.000Z",
      })
    ).resolves.toEqual({
      kind: "message",
      title: "已經確認過囉",
      message: "這個邀約先前已經確認為 週一上午，如需更改時間請直接聯繫對方。",
    });
    expect(read.refetchInvite).toHaveBeenCalledWith("invite-1");
  });

  it("keeps duplicate POSTs out of calendar, email, LINE, and activity side effects", async () => {
    const read = createReadSource();
    const fixture = createFulfilmentSource();
    read.findInviteForFulfilment.mockResolvedValue(
      fulfilmentRow({ calendar_event_id: "already-created" })
    );

    await expect(
      fulfilVisitPublicInvite({
        inviteId: "invite-1",
        locationValue: "台北",
        read,
        fulfilment: fixture.source,
        renderThankYouEmail: vi.fn(),
      })
    ).resolves.toEqual({
      page: {
        kind: "message",
        title: "已經確認過囉",
        message: "這個邀約先前已經確認為 週一上午，如需更改時間請直接聯繫對方。",
      },
    });
    expect(fixture.calls).toEqual([]);
  });

  it("preserves successful calendar, email, LINE, activity order and deferred research payload", async () => {
    const read = createReadSource();
    const fixture = createFulfilmentSource();
    const renderThankYouEmail = vi.fn(() => "<html>thanks</html>");
    const scheduleBackgroundResearch = vi.fn();
    read.findInviteForFulfilment.mockResolvedValue(fulfilmentRow());

    const result = await fulfilVisitPublicInvite({
      inviteId: "invite-1",
      locationValue: "  台北辦公室  ",
      read,
      fulfilment: fixture.source,
      renderThankYouEmail,
      scheduleBackgroundResearch,
    });

    expect(fixture.calls).toEqual(["settings", "calendar", "fulfilled", "email", "line", "activity"]);
    expect(fixture.source.createCalendarEvent).toHaveBeenCalledWith({
      summary: "Dennis 拜訪 Dennis（CabLate）",
      description: "由 Dennis 透過約拜訪 Agent 安排的喝咖啡，對象：Dennis / CabLate。",
      location: "台北辦公室",
      startISO: "2026-08-03T01:00:00.000Z",
      endISO: "2026-08-03T02:00:00.000Z",
      attendeeEmail: "dennis@example.test",
    });
    expect(fixture.source.updateInviteFulfilled).toHaveBeenCalledWith(
      "invite-1",
      "event-1",
      "台北辦公室"
    );
    expect(renderThankYouEmail).toHaveBeenCalledWith({
      contactName: "Dennis",
      senderName: "Dennis",
      chosenLabel: "週一上午",
      location: "台北辦公室",
    });
    expect(result).toEqual({
      page: {
        kind: "message",
        title: "時段已確認！",
        message: "已為您安排 週一上午，地點約在 台北辦公室，行事曆邀請與確認信都已經寄到您的信箱囉，謝謝您！",
      },
    });
    expect(scheduleBackgroundResearch).toHaveBeenCalledWith({
      input: {
        contactId: "contact-1",
        inviteId: "invite-1",
        name: "Dennis",
        company: "CabLate",
        title: "Founder",
        email: "dennis@example.test",
      },
      lineUserId: "U123",
      notificationText:
        "🔎 我順手查了 Dennis與 CabLate 的公開資料，行前功課整理好了——在「約拜訪」頁面可以看到公司近況、社群連結與可以聊的切入點。",
    });
  });

  it("records the original failure outcome and leaves no deferred research when calendar creation fails", async () => {
    const read = createReadSource();
    const fixture = createFulfilmentSource({ calendarError: new Error("calendar unavailable") });
    read.findInviteForFulfilment.mockResolvedValue(fulfilmentRow());

    await expect(
      fulfilVisitPublicInvite({
        inviteId: "invite-1",
        locationValue: null,
        read,
        fulfilment: fixture.source,
        renderThankYouEmail: vi.fn(),
      })
    ).resolves.toEqual({
      page: {
        kind: "message",
        title: "時段已收到",
        message: "已經記錄您選擇的時間，但系統自動安排時發生了一點問題，對方會再與您確認，造成不便請見諒。",
        tone: "error",
      },
    });
    expect(fixture.calls).toEqual(["settings", "calendar", "failed", "activity", "line"]);
    expect(fixture.source.recordActivity).toHaveBeenCalledWith({
      agent_slug: "visit",
      summary: "對方確認時段後，自動排程失敗：calendar unavailable",
      status: "failed",
    });
  });

  it("keeps scheduler failures inside the original fulfilment failure boundary", async () => {
    const read = createReadSource();
    const fixture = createFulfilmentSource();
    read.findInviteForFulfilment.mockResolvedValue(fulfilmentRow());

    await expect(
      fulfilVisitPublicInvite({
        inviteId: "invite-1",
        locationValue: null,
        read,
        fulfilment: fixture.source,
        renderThankYouEmail: vi.fn(),
        scheduleBackgroundResearch: () => {
          throw new Error("after unavailable");
        },
      })
    ).resolves.toMatchObject({
      page: {
        kind: "message",
        title: "時段已收到",
        tone: "error",
      },
    });
    expect(fixture.calls).toEqual([
      "settings",
      "calendar",
      "fulfilled",
      "email",
      "line",
      "activity",
      "failed",
      "activity",
      "line",
    ]);
    expect(fixture.source.recordActivity).toHaveBeenLastCalledWith({
      agent_slug: "visit",
      summary: "對方確認時段後，自動排程失敗：after unavailable",
      status: "failed",
    });
  });
});
