import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase } = vi.hoisted(() => ({ getMainSupabase: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { getLiveImage, getLiveTaskState, setLiveTask } from "@/lib/live-task-store";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe("Live task store", () => {
  it("preserves the partial-state merge and image-version change contract", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T05:00:00.000Z"));
    const existing = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { step: 3, status: "waiting", caption: "prior", image: "old-image", image_version: 7 },
      }),
    };
    existing.select.mockReturnValue(existing);
    existing.eq.mockReturnValue(existing);
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValueOnce(existing).mockReturnValueOnce({ upsert });
    getMainSupabase.mockReturnValue({ from });

    await setLiveTask("visit", { caption: "next", image: "new-image" });

    expect(existing.select).toHaveBeenCalledWith("step,status,caption,image,image_version");
    expect(existing.eq).toHaveBeenCalledWith("agent_slug", "visit");
    expect(upsert).toHaveBeenCalledWith(
      {
        agent_slug: "visit",
        step: 3,
        status: "waiting",
        caption: "next",
        image: "new-image",
        image_version: Date.parse("2026-08-02T05:00:00.000Z"),
        updated_at: "2026-08-02T05:00:00.000Z",
      },
      { onConflict: "agent_slug" },
    );
  });

  it("maps a fresh stored task to the live-state contract", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T05:00:00.000Z"));
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          step: 4,
          status: "waiting",
          caption: "reviewing",
          image_version: 9,
          updated_at: "2026-08-02T04:59:00.000Z",
        },
      }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    getMainSupabase.mockReturnValue({ from: vi.fn(() => query) });

    await expect(getLiveTaskState("support")).resolves.toEqual({
      agentSlug: "support",
      step: 4,
      status: "waiting",
      caption: "reviewing",
      hasImage: true,
      imageVersion: 9,
      updatedAt: Date.parse("2026-08-02T04:59:00.000Z"),
    });
  });

  it("keeps stale task and missing image as null", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T05:00:00.000Z"));
    const stale = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          step: 1,
          status: "active",
          caption: null,
          image_version: 0,
          updated_at: "2026-08-02T04:57:59.999Z",
        },
      }),
    };
    stale.select.mockReturnValue(stale);
    stale.eq.mockReturnValue(stale);
    const image = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { image: null } }),
    };
    image.select.mockReturnValue(image);
    image.eq.mockReturnValue(image);
    const from = vi.fn().mockReturnValueOnce(stale).mockReturnValueOnce(image);
    getMainSupabase.mockReturnValue({ from });

    await expect(getLiveTaskState("visit")).resolves.toBeNull();
    await expect(getLiveImage("visit")).resolves.toBeNull();
  });
});
