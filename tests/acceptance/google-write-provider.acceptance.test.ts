import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { google } from "googleapis";

import { ensureFreshAccessToken, getGoogleOAuthClient } from "@/lib/google-auth";
import { createCalendarEvent, sendGmail } from "@/lib/google";

const GATE = "GOOGLE_WRITE_ACCEPTANCE";
const COMMAND = "npm run acceptance:google:write";
const REQUIRED_ENV = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"] as const;

let calendar: ReturnType<typeof google.calendar>;
let eventId: string | null = null;
let recipient = "";
let marker = "";

function providerStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { code?: number; response?: { status?: number } };
  return candidate.response?.status ?? candidate.code;
}

async function deleteAcceptanceEvent() {
  if (!eventId) return;
  const id = eventId;
  await calendar.events.delete({ calendarId: "primary", eventId: id, sendUpdates: "all" });
  eventId = null;

  try {
    const { data } = await calendar.events.get({ calendarId: "primary", eventId: id });
    expect(data.status).toBe("cancelled");
  } catch (error) {
    expect([404, 410]).toContain(providerStatus(error));
  }
}

beforeAll(async () => {
  if (process.env[GATE] !== "1") {
    throw new Error(`${GATE} is opt-in. Set ${GATE}=1 before running ${COMMAND}.`);
  }

  const missing: string[] = REQUIRED_ENV.filter((name) => !process.env[name]);
  recipient = process.env.GOOGLE_WRITE_ACCEPTANCE_RECIPIENT?.trim() ?? "";
  if (!recipient) missing.push("GOOGLE_WRITE_ACCEPTANCE_RECIPIENT");
  if (missing.length > 0) {
    throw new Error(`Google write acceptance is missing ${missing.join(", ")}; no provider writes were made.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || recipient.includes(",")) {
    throw new Error("GOOGLE_WRITE_ACCEPTANCE_RECIPIENT must be exactly one valid email address.");
  }

  marker = `KV-STAGING-ACCEPTANCE-${Date.now()}`;
  const auth = getGoogleOAuthClient();
  await ensureFreshAccessToken(auth);
  calendar = google.calendar({ version: "v3", auth });
});

afterAll(async () => {
  if (eventId) await deleteAcceptanceEvent();
});

describe.sequential("Google write provider acceptance", () => {
  it("creates, reads back, and deletes one uniquely marked Calendar event", async () => {
    const start = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    start.setUTCHours(2, 0, 0, 0);
    const end = new Date(start.getTime() + 15 * 60 * 1000);

    eventId = await createCalendarEvent({
      summary: `[KV Staging Acceptance] ${marker}`,
      description: "Automated staging acceptance. This event is deleted immediately after provider read-back.",
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      attendeeEmail: recipient,
    });

    const { data } = await calendar.events.get({ calendarId: "primary", eventId });
    expect(data.id).toBe(eventId);
    expect(data.summary).toContain(marker);
    expect(data.attendees?.some((attendee) => attendee.email === recipient)).toBe(true);

    await deleteAcceptanceEvent();
  });

  it("sends one uniquely marked Gmail to the allowlisted recipient", async () => {
    await expect(
      sendGmail({
        to: recipient,
        subject: `[KV Staging Acceptance] Gmail write ${marker}`,
        body: `KV staging Gmail provider acceptance succeeded. Marker: ${marker}`,
      })
    ).resolves.toBeUndefined();
  });
});
