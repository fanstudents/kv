import { describe, expect, it, vi } from "vitest";
import {
  createChecklistService,
  parseChecklistUpdateRequest,
  type ChecklistRepository,
} from "@/modules/checklist/service";

function repository(overrides: Partial<ChecklistRepository> = {}): ChecklistRepository {
  return {
    list: vi.fn(async () => ({ data: [{ item_id: "a", done: true }], error: null })),
    upsert: vi.fn(async (input) => ({ data: input, error: null })),
    ...overrides,
  };
}

describe("Checklist service", () => {
  it("coerces done and keeps the route id", () => {
    expect(parseChecklistUpdateRequest("item-1", { done: 1 })).toEqual({ itemId: "item-1", done: true });
    expect(parseChecklistUpdateRequest("item-1", { done: 0 })).toEqual({ itemId: "item-1", done: false });
    expect(parseChecklistUpdateRequest("item-1", null)).toEqual({ itemId: "item-1", done: false });
    expect(parseChecklistUpdateRequest("item-1", {})).toEqual({ itemId: "item-1", done: false });
  });

  it("returns checklist rows unchanged", async () => {
    const repo = repository();
    await expect(createChecklistService(repo).read()).resolves.toEqual({
      kind: "ok",
      data: [{ item_id: "a", done: true }],
    });
    expect(repo.list).toHaveBeenCalledOnce();
  });

  it("passes a deterministic update timestamp", async () => {
    const repo = repository();
    const now = new Date("2026-07-31T00:00:00.000Z");

    await expect(
      createChecklistService(repo).update({ itemId: "item-1", done: true }, now),
    ).resolves.toEqual({
      kind: "ok",
      data: { itemId: "item-1", done: true, updatedAt: now.toISOString() },
    });
    expect(repo.upsert).toHaveBeenCalledWith({
      itemId: "item-1",
      done: true,
      updatedAt: now.toISOString(),
    });
  });

  it("maps repository errors without changing the HTTP boundary", async () => {
    const service = createChecklistService(repository({
      list: vi.fn(async () => ({ data: null, error: { message: "query failed" } })),
      upsert: vi.fn(async () => ({ data: null, error: { message: "write failed" } })),
    }));

    await expect(service.read()).resolves.toEqual({ kind: "error", message: "query failed" });
    await expect(service.update({ itemId: "item-1", done: true })).resolves.toEqual({
      kind: "error",
      message: "write failed",
    });
  });
});
