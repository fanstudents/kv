import { describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyChecklistUpdateAdapter } from "@/adapters/checklist/legacy-update-adapter";

describe("createLegacyChecklistUpdateAdapter", () => {
  it("keeps the legacy upsert/select/single write chain", async () => {
    const response = Promise.resolve({ data: { item_id: "item-1", done: true }, error: null });
    const query = {
      upsert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
      then: response.then.bind(response),
    };
    query.upsert.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockReturnValue(query);
    const from = vi.fn(() => query);
    getSupabase.mockReturnValue({ from });

    await expect(
      createLegacyChecklistUpdateAdapter().upsert({
        itemId: "item-1",
        done: true,
        updatedAt: "2026-07-31T00:00:00.000Z",
      }),
    ).resolves.toEqual({ data: { item_id: "item-1", done: true }, error: null });
    expect(getSupabase).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("checklist_status");
    expect(query.upsert).toHaveBeenCalledWith({
      item_id: "item-1",
      done: true,
      updated_at: "2026-07-31T00:00:00.000Z",
    });
    expect(query.select).toHaveBeenCalledWith();
    expect(query.single).toHaveBeenCalledWith();
  });
});
