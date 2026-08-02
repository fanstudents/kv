import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { calendar, eventsList, getGoogleOAuthClient } = vi.hoisted(() => ({
  calendar: vi.fn(),
  eventsList: vi.fn(),
  getGoogleOAuthClient: vi.fn(),
}));

vi.mock("googleapis", () => ({ google: { calendar } }));
vi.mock("@/lib/google-auth", () => ({ getGoogleOAuthClient }));

import { listWeekOverview } from "@/lib/google";

const ADDITIONAL_CALENDAR_KEY = "GOOGLE_ADDITIONAL_CALENDAR_IDS";
const originalAdditionalCalendars = process.env[ADDITIONAL_CALENDAR_KEY];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-02T04:00:00.000Z"));
  delete process.env[ADDITIONAL_CALENDAR_KEY];
  getGoogleOAuthClient.mockReturnValue({ kind: "oauth-client" });
  calendar.mockReturnValue({ events: { list: eventsList } });
});

afterEach(() => {
  vi.useRealTimers();
  if (originalAdditionalCalendars === undefined) delete process.env[ADDITIONAL_CALENDAR_KEY];
  else process.env[ADDITIONAL_CALENDAR_KEY] = originalAdditionalCalendars;
});

describe("Calendar read adapter", () => {
  it("does not construct the Calendar SDK when OAuth configuration fails", async () => {
    getGoogleOAuthClient.mockImplementation(() => {
      throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN environment variables");
    });

    await expect(listWeekOverview()).rejects.toThrow("Missing GOOGLE_CLIENT_ID");

    expect(calendar).not.toHaveBeenCalled();
    expect(eventsList).not.toHaveBeenCalled();
  });

  it("merges configured shared calendars while isolating an unreadable one", async () => {
    process.env[ADDITIONAL_CALENDAR_KEY] = "team@example.com, shared@example.com";
    eventsList.mockImplementation((request: { calendarId: string }) => {
      if (request.calendarId === "primary") {
        return Promise.resolve({
          data: {
            items: [
              {
                summary: "Primary meeting",
                start: { dateTime: "2026-08-03T01:00:00.000Z" },
                end: { dateTime: "2026-08-03T02:00:00.000Z" },
              },
            ],
          },
        });
      }
      if (request.calendarId === "team@example.com") {
        return Promise.resolve({
          data: {
            items: [
              {
                summary: "Shared meeting",
                start: { dateTime: "2026-08-03T02:10:00.000Z" },
                end: { dateTime: "2026-08-03T03:00:00.000Z" },
              },
            ],
          },
        });
      }
      return Promise.reject(new Error("calendar share revoked"));
    });

    await expect(listWeekOverview()).resolves.toEqual({
      dayCounts: [0, 2, 0, 0, 0, 0, 0],
      upcoming: [
        { label: "8/3（一）09:00", title: "Primary meeting" },
        { label: "8/3（一）10:10", title: "Shared meeting" },
      ],
      warnings: ["8/3（一）10:10 兩場行程僅相隔 10 分"],
    });

    expect(eventsList).toHaveBeenCalledTimes(3);
    expect(eventsList.mock.calls.map(([request]) => request.calendarId)).toEqual([
      "primary",
      "team@example.com",
      "shared@example.com",
    ]);
    expect(eventsList).toHaveBeenCalledWith({
      calendarId: "primary",
      timeMin: "2026-08-02T04:00:00.000Z",
      timeMax: "2026-10-30T16:00:00.000Z",
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });
  });
});
