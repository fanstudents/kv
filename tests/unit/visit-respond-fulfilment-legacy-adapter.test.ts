import { describe, expect, it, vi } from "vitest";

const {
  pushLineMessage,
  getSupabase,
  getVisitSettings,
  createCalendarEvent,
  sendEmail,
} = vi.hoisted(() => ({
  pushLineMessage: vi.fn(),
  getSupabase: vi.fn(),
  getVisitSettings: vi.fn(),
  createCalendarEvent: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/line", () => ({ pushLineMessage }));
vi.mock("@/lib/supabase", () => ({ getSupabase }));
vi.mock("@/adapters/visit/supabase-visit-settings", () => ({
  createSupabaseVisitSettings: () => ({ get: getVisitSettings }),
}));
vi.mock("@/adapters/visit/legacy-provider-adapter", () => ({
  legacyVisitProviders: { createCalendarEvent, sendEmail },
}));

import { createLegacyVisitRespondFulfilmentSource } from "@/adapters/visit/legacy-respond-sources";

describe("legacy Visit respond fulfilment source", () => {
  it("keeps settings/provider calls and pending invite/activity writes behind the port", async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      insert: vi.fn(),
    };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.insert.mockReturnValue(query);
    const client = { from: vi.fn(() => query) };
    getSupabase.mockReturnValue(client);
    getVisitSettings.mockResolvedValue({ senderName: "Dennis" });
    createCalendarEvent.mockResolvedValue("event-1");
    sendEmail.mockResolvedValue(undefined);
    pushLineMessage.mockResolvedValue(undefined);
    const adapter = createLegacyVisitRespondFulfilmentSource();

    await expect(adapter.getSettings()).resolves.toEqual({ senderName: "Dennis" });
    await expect(adapter.createCalendarEvent({
      summary: "meeting",
      startISO: "2026-07-31T01:00:00.000Z",
      endISO: "2026-07-31T02:00:00.000Z",
      attendeeEmail: "d@example.test",
    })).resolves.toBe("event-1");
    await adapter.updateInviteFulfilled("i1", "event-1", "Taipei");
    await adapter.sendThankYouEmail({ to: "d@example.test", subject: "done", body: "html", html: true });
    await adapter.pushLineMessage("U1", "done");
    await adapter.recordActivity({ agent_slug: "visit", summary: "done", status: "success" });
    await adapter.markInviteFailed("i1");
    expect(query.update).toHaveBeenCalledWith({ calendar_event_id: "event-1", location: "Taipei" });
    expect(query.update).toHaveBeenCalledWith({ status: "failed" });
    expect(query.insert).toHaveBeenCalledWith({ agent_slug: "visit", summary: "done", status: "success" });
    expect(pushLineMessage).toHaveBeenCalledWith("U1", "done");
    expect(sendEmail).toHaveBeenCalledWith({ to: "d@example.test", subject: "done", body: "html", html: true });
  });
});
