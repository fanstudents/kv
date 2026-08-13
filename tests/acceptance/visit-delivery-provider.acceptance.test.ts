import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { google } from "googleapis";

import { createLegacyVisitRespondSources } from "@/adapters/visit/legacy-respond-sources";
import { buildThankYouEmailHtml } from "@/lib/email-templates";
import { ensureFreshAccessToken, getGoogleOAuthClient } from "@/lib/google-auth";
import { getMainSupabase } from "@/lib/supabase";
import { fulfilVisitPublicInvite } from "@/modules/visit/respond";

const GATE = "VISIT_DELIVERY_ACCEPTANCE";
const COMMAND = "npm run acceptance:visit:delivery";

let marker = "";
let recipient = "";
let contactId: string | null = null;
let inviteId: string | null = null;
let calendarEventId: string | null = null;
let windowStart = "";
let windowEnd = "";

const supabase = getMainSupabase();

async function removeCalendarFixtures() {
  const auth = getGoogleOAuthClient();
  await ensureFreshAccessToken(auth);
  const calendar = google.calendar({ version: "v3", auth });
  const ids = new Set<string>();
  if (calendarEventId) ids.add(calendarEventId);

  if (windowStart && windowEnd && marker) {
    const { data } = await calendar.events.list({
      calendarId: "primary",
      q: marker,
      timeMin: windowStart,
      timeMax: windowEnd,
      singleEvents: true,
      showDeleted: false,
    });
    for (const event of data.items ?? []) if (event.id) ids.add(event.id);
  }

  for (const eventId of ids) {
    await calendar.events
      .delete({ calendarId: "primary", eventId, sendUpdates: "all" })
      .catch((error: unknown) => {
        const status = (error as { code?: number; response?: { status?: number } })?.response?.status
          ?? (error as { code?: number })?.code;
        if (status !== 404 && status !== 410) throw error;
      });
  }
  calendarEventId = null;
}

async function removeDatabaseFixtures() {
  if (marker) {
    const { error } = await supabase.from("line_agent_activity").delete().ilike("summary", `%${marker}%`);
    if (error) throw error;
  }
  if (inviteId) {
    const { error } = await supabase.from("pending_invites").delete().eq("id", inviteId);
    if (error) throw error;
    inviteId = null;
  }
  if (contactId) {
    const { error } = await supabase.from("contacts").delete().eq("id", contactId);
    if (error) throw error;
    contactId = null;
  }
}

beforeAll(() => {
  if (process.env[GATE] !== "1") {
    throw new Error(`${GATE} is opt-in. Set ${GATE}=1 before running ${COMMAND}.`);
  }
  recipient = process.env.GOOGLE_WRITE_ACCEPTANCE_RECIPIENT?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || recipient.includes(",")) {
    throw new Error("GOOGLE_WRITE_ACCEPTANCE_RECIPIENT must be exactly one valid email address.");
  }
  marker = `KV-VISIT-ACCEPTANCE-${Date.now()}`;
});

afterAll(async () => {
  await removeCalendarFixtures();
  await removeDatabaseFixtures();
});

describe.sequential("Visit delivery provider acceptance", () => {
  it("fulfils one synthetic staging invite through Main, Calendar, and Gmail", async () => {
    const start = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    start.setUTCHours(2, 30, 0, 0);
    const end = new Date(start.getTime() + 15 * 60 * 1000);
    windowStart = new Date(start.getTime() - 60 * 60 * 1000).toISOString();
    windowEnd = new Date(end.getTime() + 60 * 60 * 1000).toISOString();

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        name: marker,
        company: "KV Staging",
        title: "Synthetic acceptance fixture",
        email: recipient,
        source: "acceptance",
        line_user_id: `no-line-${marker}`,
      })
      .select("id")
      .single();
    if (contactError) throw contactError;
    contactId = contact.id;

    const { data: invite, error: inviteError } = await supabase
      .from("pending_invites")
      .insert({
        line_user_id: `no-line-${marker}`,
        contact_id: contactId,
        to_email: recipient,
        subject: `[KV Staging Acceptance] ${marker}`,
        body: "Synthetic Visit delivery acceptance fixture.",
        slot1: `[KV Staging Acceptance] ${marker}`,
        slot1_start: start.toISOString(),
        slot1_end: end.toISOString(),
        slot2: "Unused acceptance slot",
        slot2_start: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        slot2_end: new Date(end.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        status: "confirmed",
        chosen_slot: "1",
        resolved_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (inviteError) throw inviteError;
    inviteId = invite.id;

    const sources = createLegacyVisitRespondSources();
    const result = await fulfilVisitPublicInvite({
      inviteId,
      locationValue: "KV staging acceptance — no physical venue",
      read: sources.read,
      fulfilment: sources.fulfilment,
      renderThankYouEmail: buildThankYouEmailHtml,
    });

    expect(result.page).toMatchObject({ kind: "message", title: "時段已確認！" });

    const { data: persisted, error: persistedError } = await supabase
      .from("pending_invites")
      .select("status, calendar_event_id, location")
      .eq("id", inviteId)
      .single();
    if (persistedError) throw persistedError;
    expect(persisted.status).toBe("confirmed");
    const persistedEventId = persisted.calendar_event_id;
    expect(persistedEventId).toBeTruthy();
    if (!persistedEventId) throw new Error("Visit fulfilment did not persist the Calendar event id");
    expect(persisted.location).toBe("KV staging acceptance — no physical venue");
    calendarEventId = persistedEventId;

    const { data: activities, error: activityError } = await supabase
      .from("line_agent_activity")
      .select("status, summary")
      .ilike("summary", `%${marker}%`);
    if (activityError) throw activityError;
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ status: "success" });

    const auth = getGoogleOAuthClient();
    await ensureFreshAccessToken(auth);
    const calendar = google.calendar({ version: "v3", auth });
    const { data: event } = await calendar.events.get({ calendarId: "primary", eventId: persistedEventId });
    expect(event.summary).toContain(marker);
    expect(event.attendees?.some((attendee) => attendee.email === recipient)).toBe(true);
  });
});
