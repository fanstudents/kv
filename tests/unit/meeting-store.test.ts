import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase } = vi.hoisted(() => ({ getMainSupabase: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import {
  appendTurns,
  finishMeeting,
  getRecentHistory,
  getSignedRecordingUrl,
} from "@/lib/meeting-store";

beforeEach(() => vi.clearAllMocks());

describe("Meeting store persistence boundaries", () => {
  it("checks turn count and insert failures", async () => {
    const countQuery = {
      select: vi.fn(),
      eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
    };
    countQuery.select.mockReturnValue(countQuery);
    const insert = vi.fn().mockResolvedValue({ error: null });
    getMainSupabase.mockReturnValue({
      from: vi.fn().mockReturnValueOnce(countQuery).mockReturnValueOnce({ insert }),
    });

    await expect(appendTurns("meeting-1", [{ role: "boss", content: "hello" }])).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({ meeting_id: "meeting-1", turn_index: 1, content: "hello" }),
    ]);

    countQuery.eq.mockResolvedValueOnce({ count: null, error: { message: "count failed" } });
    getMainSupabase.mockReturnValue({ from: () => countQuery });
    await expect(appendTurns("meeting-1", [{ role: "boss", content: "hello" }])).rejects.toThrow("count failed");

    countQuery.eq.mockResolvedValueOnce({ count: 0, error: null });
    insert.mockResolvedValueOnce({ error: { message: "insert failed" } });
    const failingInsertClient = {
      from: vi.fn().mockReturnValueOnce(countQuery).mockReturnValueOnce({ insert }),
    };
    getMainSupabase.mockReturnValue(failingInsertClient);
    await expect(appendTurns("meeting-1", [{ role: "boss", content: "hello" }])).rejects.toThrow("insert failed");
  });

  it("propagates history read failures instead of treating them as no history", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: "history failed" } }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    getMainSupabase.mockReturnValue({ from: () => query });

    await expect(getRecentHistory("meeting-1")).rejects.toThrow("history failed");
  });

  it("checks summary lookup and final meeting update failures", async () => {
    const summary = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { content: "done" }, error: null }),
    };
    summary.select.mockReturnValue(summary);
    summary.eq.mockReturnValue(summary);
    summary.order.mockReturnValue(summary);
    summary.limit.mockReturnValue(summary);
    const update = {
      update: vi.fn(),
      eq: vi.fn().mockResolvedValue({ error: { message: "update failed" } }),
    };
    update.update.mockReturnValue(update);
    getMainSupabase.mockReturnValue({
      from: vi.fn().mockReturnValueOnce(summary).mockReturnValueOnce(update),
    });

    await expect(finishMeeting("meeting-1", { transcript: "notes" })).rejects.toThrow("update failed");

    summary.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "summary failed" } });
    getMainSupabase.mockReturnValueOnce({ from: () => summary });
    await expect(finishMeeting("meeting-1", {})).rejects.toThrow("summary failed");
  });

  it("distinguishes no recording from database and signed-url failures", async () => {
    const meeting = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { recording_path: null }, error: null }),
    };
    meeting.select.mockReturnValue(meeting);
    meeting.eq.mockReturnValue(meeting);
    const createSignedUrl = vi.fn();
    getMainSupabase.mockReturnValue({
      from: () => meeting,
      storage: { from: () => ({ createSignedUrl }) },
    });

    await expect(getSignedRecordingUrl("meeting-1")).resolves.toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();

    meeting.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "meeting failed" } });
    await expect(getSignedRecordingUrl("meeting-1")).rejects.toThrow("meeting failed");

    meeting.maybeSingle.mockResolvedValueOnce({ data: { recording_path: "meeting-1/recording.webm" }, error: null });
    createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: "sign failed" } });
    await expect(getSignedRecordingUrl("meeting-1")).rejects.toThrow("sign failed");
  });
});
