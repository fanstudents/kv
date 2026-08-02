import { beforeEach, describe, expect, it, vi } from "vitest";


const getMainSupabase = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createSupabaseVisitSettings } from "@/adapters/visit/supabase-visit-settings";

function createClient(settings: Record<string, unknown> | null) {
  const single = vi.fn().mockResolvedValue({ data: settings === null ? null : { settings } });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return { client: { from }, from, select, eq, single };
}

describe("Supabase Visit settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps the existing Visit settings row without changing its values", async () => {
    const db = createClient({
      rangeStartDays: "4",
      rangeEndDays: 9,
      meetingDuration: "45",
      meetingType: "線上會議",
      workingHoursStart: "10:00",
      workingHoursEnd: "17:30",
      senderName: "Dennis",
      requireApproval: false,
    });
    getMainSupabase.mockReturnValue(db.client);

    await expect(createSupabaseVisitSettings().get()).resolves.toEqual({
      rangeStartDays: 4,
      rangeEndDays: 9,
      meetingDuration: 45,
      meetingType: "線上會議",
      workingHoursStart: "10:00",
      workingHoursEnd: "17:30",
      senderName: "Dennis",
      requireApproval: false,
    });
    expect(db.from).toHaveBeenCalledWith("line_agents");
    expect(db.select).toHaveBeenCalledWith("settings");
    expect(db.eq).toHaveBeenCalledWith("slug", "visit");
  });

  it("keeps the existing defaults for a missing or invalid settings row", async () => {
    const db = createClient({
      rangeStartDays: 0,
      rangeEndDays: "invalid",
      meetingDuration: null,
      meetingType: "",
      senderName: "",
      requireApproval: "false",
    });
    getMainSupabase.mockReturnValue(db.client);
    const settings = createSupabaseVisitSettings();

    await expect(settings.get()).resolves.toEqual({
      rangeStartDays: 3,
      rangeEndDays: 7,
      meetingDuration: 60,
      meetingType: "喝咖啡",
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      senderName: "樊松蒲 Dennis",
      requireApproval: true,
    });
  });

  it("reuses the lazy Supabase client across reads", async () => {
    const db = createClient(null);
    getMainSupabase.mockReturnValue(db.client);
    const settings = createSupabaseVisitSettings();

    await settings.get();
    await settings.get();

    expect(getMainSupabase).toHaveBeenCalledOnce();
    expect(db.single).toHaveBeenCalledTimes(2);
  });
});
