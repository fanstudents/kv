import { describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyChecklistReadAdapter } from "@/adapters/checklist/legacy-read-adapter";

describe("createLegacyChecklistReadAdapter", () => {
  it("keeps the legacy checklist projection query", async () => {
    const response = Promise.resolve({
      data: [{ item_id: "a", done: true }],
      error: null,
    });
    const query = {
      select: vi.fn(),
      then: response.then.bind(response),
    };
    query.select.mockReturnValue(query);
    const from = vi.fn(() => query);
    getSupabase.mockReturnValue({ from });

    await expect(createLegacyChecklistReadAdapter().list()).resolves.toEqual({
      data: [{ item_id: "a", done: true }],
      error: null,
    });
    expect(getSupabase).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("checklist_status");
    expect(query.select).toHaveBeenCalledWith("item_id, done");
  });
});
