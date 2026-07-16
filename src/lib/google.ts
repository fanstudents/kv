import "server-only";
import { google } from "googleapis";

// 台北無日光節約時間，用固定 UTC+8 位移換算即可，不需要完整時區資料庫
const TAIPEI_OFFSET_MINUTES = 8 * 60;

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN environment variables"
    );
  }
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function toTaipeiParts(date: Date) {
  const shifted = new Date(date.getTime() + TAIPEI_OFFSET_MINUTES * 60000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    day: shifted.getUTCDay(),
  };
}

function taipeiWallToUtc(year: number, month: number, date: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month, date, hour, minute) - TAIPEI_OFFSET_MINUTES * 60000);
}

function formatTaipeiLabel(date: Date): string {
  const parts = toTaipeiParts(date);
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][parts.day];
  const shifted = new Date(date.getTime() + TAIPEI_OFFSET_MINUTES * 60000);
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${parts.month + 1}/${parts.date}（${weekday}）${hh}:${mm}`;
}

export interface FreeSlot {
  start: string;
  end: string;
  label: string;
}

export async function findFreeSlots(params: {
  rangeStartDays: number;
  rangeEndDays: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  meetingDurationMinutes: number;
  slotCount: number;
}): Promise<FreeSlot[]> {
  const calendar = google.calendar({ version: "v3", auth: getOAuthClient() });
  const now = new Date();
  const [startH, startM] = params.workingHoursStart.split(":").map(Number);
  const [endH, endM] = params.workingHoursEnd.split(":").map(Number);

  const rangeStartParts = toTaipeiParts(new Date(now.getTime() + params.rangeStartDays * 86400000));
  const rangeEndParts = toTaipeiParts(new Date(now.getTime() + params.rangeEndDays * 86400000));

  const timeMin = taipeiWallToUtc(rangeStartParts.year, rangeStartParts.month, rangeStartParts.date, 0, 0);
  const timeMax = taipeiWallToUtc(rangeEndParts.year, rangeEndParts.month, rangeEndParts.date, 23, 59);

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  const busy = (data.calendars?.primary?.busy ?? []).map((b) => ({
    start: new Date(b.start ?? "").getTime(),
    end: new Date(b.end ?? "").getTime(),
  }));

  const slots: FreeSlot[] = [];
  const stepMinutes = 30;
  const durationMs = params.meetingDurationMinutes * 60000;

  for (
    let dayOffset = params.rangeStartDays;
    dayOffset <= params.rangeEndDays && slots.length < params.slotCount;
    dayOffset++
  ) {
    const dayParts = toTaipeiParts(new Date(now.getTime() + dayOffset * 86400000));
    if (dayParts.day === 0 || dayParts.day === 6) continue;

    let cursor = taipeiWallToUtc(dayParts.year, dayParts.month, dayParts.date, startH, startM);
    const dayEnd = taipeiWallToUtc(dayParts.year, dayParts.month, dayParts.date, endH, endM);

    while (cursor.getTime() + durationMs <= dayEnd.getTime() && slots.length < params.slotCount) {
      const slotStart = cursor.getTime();
      const slotEnd = slotStart + durationMs;
      const conflict = busy.some((b) => slotStart < b.end && slotEnd > b.start);
      if (!conflict && slotStart > now.getTime()) {
        slots.push({
          start: new Date(slotStart).toISOString(),
          end: new Date(slotEnd).toISOString(),
          label: formatTaipeiLabel(new Date(slotStart)),
        });
      }
      cursor = new Date(cursor.getTime() + stepMinutes * 60000);
    }
  }

  return slots;
}

export async function sendGmail(params: { to: string; subject: string; body: string; html?: boolean }) {
  const gmail = google.gmail({ version: "v1", auth: getOAuthClient() });

  const encodedSubject = `=?UTF-8?B?${Buffer.from(params.subject, "utf-8").toString("base64")}?=`;
  const messageLines = [
    `To: ${params.to}`,
    `Subject: ${encodedSubject}`,
    `Content-Type: text/${params.html ? "html" : "plain"}; charset=utf-8`,
    "MIME-Version: 1.0",
    "",
    params.body,
  ];
  const raw = Buffer.from(messageLines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

export async function createCalendarEvent(params: {
  summary: string;
  description?: string;
  startISO: string;
  endISO: string;
  attendeeEmail: string;
}): Promise<string> {
  const calendar = google.calendar({ version: "v3", auth: getOAuthClient() });

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startISO, timeZone: "Asia/Taipei" },
      end: { dateTime: params.endISO, timeZone: "Asia/Taipei" },
      attendees: [{ email: params.attendeeEmail }],
    },
  });

  return data.id ?? "";
}
