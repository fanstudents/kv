import { beforeEach, describe, expect, it, vi } from "vitest";

const { calendar, eventsInsert, getGoogleOAuthClient, gmail, messagesSend } = vi.hoisted(() => ({
  calendar: vi.fn(),
  eventsInsert: vi.fn(),
  getGoogleOAuthClient: vi.fn(),
  gmail: vi.fn(),
  messagesSend: vi.fn(),
}));

vi.mock("googleapis", () => ({ google: { calendar, gmail } }));
vi.mock("@/lib/google-auth", () => ({ getGoogleOAuthClient }));

import { createCalendarEvent, sendGmail } from "@/lib/google";

beforeEach(() => {
  vi.clearAllMocks();
  const auth = { kind: "oauth-client" };
  getGoogleOAuthClient.mockReturnValue(auth);
  calendar.mockReturnValue({ events: { insert: eventsInsert } });
  gmail.mockReturnValue({ users: { messages: { send: messagesSend } } });
});

describe("Google write boundary", () => {
  it("encodes the established Gmail MIME envelope and sends through the authenticated account", async () => {
    messagesSend.mockResolvedValue({ data: { id: "message-1" } });

    await sendGmail({
      to: "fixture@example.test",
      subject: "拜訪確認",
      body: "<p>測試內容</p>",
      html: true,
    });

    expect(gmail).toHaveBeenCalledWith({ version: "v1", auth: { kind: "oauth-client" } });
    expect(messagesSend).toHaveBeenCalledWith({
      userId: "me",
      requestBody: { raw: expect.any(String) },
    });
    const [{ requestBody }] = messagesSend.mock.calls[0] as [{ requestBody: { raw: string } }];
    expect(Buffer.from(requestBody.raw, "base64url").toString("utf8")).toBe(
      [
        "To: fixture@example.test",
        `Subject: =?UTF-8?B?${Buffer.from("拜訪確認", "utf8").toString("base64")}?=`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        "<p>測試內容</p>",
      ].join("\r\n")
    );
  });

  it("maps a Visit invite to one primary Calendar event with attendee updates enabled", async () => {
    eventsInsert.mockResolvedValue({ data: { id: "event-1" } });

    await expect(
      createCalendarEvent({
        summary: "Dennis 拜訪 Alice",
        description: "合成驗收資料",
        location: "台北",
        startISO: "2026-08-03T01:00:00.000Z",
        endISO: "2026-08-03T02:00:00.000Z",
        attendeeEmail: "fixture@example.test",
      })
    ).resolves.toBe("event-1");

    expect(calendar).toHaveBeenCalledWith({ version: "v3", auth: { kind: "oauth-client" } });
    expect(eventsInsert).toHaveBeenCalledWith({
      calendarId: "primary",
      sendUpdates: "all",
      requestBody: {
        summary: "Dennis 拜訪 Alice",
        description: "合成驗收資料",
        location: "台北",
        start: { dateTime: "2026-08-03T01:00:00.000Z", timeZone: "Asia/Taipei" },
        end: { dateTime: "2026-08-03T02:00:00.000Z", timeZone: "Asia/Taipei" },
        attendees: [{ email: "fixture@example.test" }],
      },
    });
  });
});
