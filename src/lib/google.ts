import "server-only";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "./google-auth";

// 台北無日光節約時間，用固定 UTC+8 位移換算即可，不需要完整時區資料庫
const TAIPEI_OFFSET_MINUTES = 8 * 60;

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
  const calendar = google.calendar({ version: "v3", auth: getGoogleOAuthClient() });
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

    // 每天最多取一個時段，確保建議的時段分散在不同天，不會同一天出現兩次
    while (cursor.getTime() + durationMs <= dayEnd.getTime()) {
      const slotStart = cursor.getTime();
      const slotEnd = slotStart + durationMs;
      const conflict = busy.some((b) => slotStart < b.end && slotEnd > b.start);
      if (!conflict && slotStart > now.getTime()) {
        slots.push({
          start: new Date(slotStart).toISOString(),
          end: new Date(slotEnd).toISOString(),
          label: formatTaipeiLabel(new Date(slotStart)),
        });
        break;
      }
      cursor = new Date(cursor.getTime() + stepMinutes * 60000);
    }
  }

  return slots;
}

export async function sendGmail(params: { to: string; subject: string; body: string; html?: boolean }) {
  const gmail = google.gmail({ version: "v1", auth: getGoogleOAuthClient() });

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

export interface WeekOverview {
  /** 未來七天，每天的行程數（index 0 = 今天，台北時間） */
  dayCounts: number[];
  /** 接下來幾筆行程（台北時間標籤 + 標題） */
  upcoming: { label: string; title: string }[];
  /** 注意事項（衝突、行程過密等） */
  warnings: string[];
}

/** 行程助理待命場景用：讀取主行事曆未來七天的真實行程總覽。 */
export async function listWeekOverview(): Promise<WeekOverview> {
  const calendar = google.calendar({ version: "v3", auth: getGoogleOAuthClient() });
  const now = new Date();
  const todayParts = toTaipeiParts(now);
  const rangeStart = taipeiWallToUtc(todayParts.year, todayParts.month, todayParts.date, 0, 0);
  const rangeEnd = new Date(rangeStart.getTime() + 7 * 86400000);

  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: rangeEnd.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });

  const events = (data.items ?? [])
    .map((e) => {
      const startIso = e.start?.dateTime ?? (e.start?.date ? `${e.start.date}T00:00:00+08:00` : null);
      const endIso = e.end?.dateTime ?? (e.end?.date ? `${e.end.date}T00:00:00+08:00` : null);
      if (!startIso) return null;
      return {
        title: e.summary || "（未命名行程）",
        allDay: !e.start?.dateTime,
        start: new Date(startIso),
        end: endIso ? new Date(endIso) : new Date(startIso),
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const dayCounts = Array.from({ length: 7 }, (_, i) => {
    const dayParts = toTaipeiParts(new Date(rangeStart.getTime() + (i + 0.5) * 86400000));
    return events.filter((e) => {
      const p = toTaipeiParts(e.start);
      return p.year === dayParts.year && p.month === dayParts.month && p.date === dayParts.date;
    }).length;
  });

  const upcoming = events
    .filter((e) => !e.allDay)
    .slice(0, 3)
    .map((e) => ({ label: formatTaipeiLabel(e.start), title: e.title }));

  // 注意事項：同日兩場行程相隔 < 30 分（或重疊）
  const warnings: string[] = [];
  const timed = events.filter((e) => !e.allDay).sort((a, b) => a.start.getTime() - b.start.getTime());
  for (let i = 1; i < timed.length && warnings.length < 2; i++) {
    const prev = timed[i - 1];
    const cur = timed[i];
    const sameDay =
      toTaipeiParts(prev.start).date === toTaipeiParts(cur.start).date &&
      toTaipeiParts(prev.start).month === toTaipeiParts(cur.start).month;
    if (!sameDay) continue;
    const gapMin = Math.round((cur.start.getTime() - prev.end.getTime()) / 60000);
    if (gapMin < 0) {
      warnings.push(`${formatTaipeiLabel(cur.start)}「${cur.title}」與前一場時間重疊`);
    } else if (gapMin < 30) {
      warnings.push(`${formatTaipeiLabel(cur.start)} 兩場行程僅相隔 ${gapMin} 分`);
    }
  }

  return { dayCounts, upcoming, warnings };
}

export async function createCalendarEvent(params: {
  summary: string;
  description?: string;
  location?: string;
  startISO: string;
  endISO: string;
  attendeeEmail: string;
}): Promise<string> {
  const calendar = google.calendar({ version: "v3", auth: getGoogleOAuthClient() });

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    requestBody: {
      summary: params.summary,
      description: params.description,
      location: params.location,
      start: { dateTime: params.startISO, timeZone: "Asia/Taipei" },
      end: { dateTime: params.endISO, timeZone: "Asia/Taipei" },
      attendees: [{ email: params.attendeeEmail }],
    },
  });

  return data.id ?? "";
}
