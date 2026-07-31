import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getVisitAgentSettings = vi.hoisted(() => vi.fn());
const getSupabase = vi.hoisted(() => vi.fn(() => ({ id: "supabase-client" })));

vi.mock("@/lib/visit-settings", () => ({ getVisitAgentSettings }));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyVisitSettingsAdapter } from "@/adapters/visit/legacy-settings-adapter";

describe("legacy Visit settings adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the existing settings query binding and result", async () => {
    const settings = {
      rangeStartDays: 3,
      rangeEndDays: 7,
      meetingDuration: 60,
      meetingType: "喝咖啡",
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      senderName: "樊松蒲 Dennis",
      requireApproval: true,
    };
    getVisitAgentSettings.mockResolvedValue(settings);
    const adapter = createLegacyVisitSettingsAdapter();

    await expect(adapter.get()).resolves.toEqual(settings);

    expect(getSupabase).toHaveBeenCalledOnce();
    expect(getVisitAgentSettings).toHaveBeenCalledWith({ id: "supabase-client" });
  });
});
