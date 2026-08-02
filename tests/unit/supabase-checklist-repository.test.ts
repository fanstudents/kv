import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase } = vi.hoisted(() => ({ getMainSupabase: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { supabaseChecklistRepository } from "@/adapters/checklist/supabase-checklist-repository";

beforeEach(() => vi.clearAllMocks());

describe("Supabase Checklist repository", () => {
  it("keeps the checklist projection query", async () => {
    const response = Promise.resolve({ data: [{ item_id: "a", done: true }], error: null });
    const query = { select: vi.fn(), then: response.then.bind(response) };
    query.select.mockReturnValue(query);
    const from = vi.fn(() => query);
    getMainSupabase.mockReturnValue({ from });

    await expect(supabaseChecklistRepository.list()).resolves.toEqual({
      data: [{ item_id: "a", done: true }],
      error: null,
    });
    expect(from).toHaveBeenCalledWith("checklist_status");
    expect(query.select).toHaveBeenCalledWith("item_id, done");
  });

  it("keeps the existing upsert/select/single write chain", async () => {
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
    getMainSupabase.mockReturnValue({ from });

    await expect(supabaseChecklistRepository.upsert({
      itemId: "item-1",
      done: true,
      updatedAt: "2026-07-31T00:00:00.000Z",
    })).resolves.toEqual({ data: { item_id: "item-1", done: true }, error: null });
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
