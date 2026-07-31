import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { insert, from, getSupabase } = vi.hoisted(() => {
  const insert = vi.fn();
  const from = vi.fn(() => ({ insert }));
  const getSupabase = vi.fn(() => ({ from }));
  return { insert, from, getSupabase };
});

vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyVisitLineActivityAdapter } from "@/adapters/visit/legacy-line-activity-adapter";

describe("legacy LINE activity adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes the unchanged legacy activity record", async () => {
    const adapter = createLegacyVisitLineActivityAdapter();
    const activity = {
      agent_slug: "visit",
      summary: "已寄出邀約信給 Alice（alice@example.com），等待對方選擇時段",
      status: "pending" as const,
    };

    await adapter.record(activity);

    expect(getSupabase).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("line_agent_activity");
    expect(insert).toHaveBeenCalledWith(activity);
  });

  it("preserves a null agent slug for generic LINE activity", async () => {
    const adapter = createLegacyVisitLineActivityAdapter();
    const activity = {
      agent_slug: null,
      summary: "回覆來自 user-1 的訊息失敗：timeout",
      status: "failed" as const,
    };

    await adapter.record(activity);

    expect(insert).toHaveBeenCalledWith(activity);
  });
});
