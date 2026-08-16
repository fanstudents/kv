import { describe, expect, it, vi } from "vitest";

import {
  getRunHistoryDetail,
  listRunHistory,
  normalizeRunHistoryQuery,
  type RunHistoryRepository,
} from "@/modules/agent-runtime/history";

function repository(): RunHistoryRepository {
  return {
    list: vi.fn().mockResolvedValue([]),
    detail: vi.fn().mockResolvedValue(null),
  };
}

describe("agent runtime history", () => {
  it("normalizes filters and clamps the query limit", () => {
    expect(normalizeRunHistoryQuery({ agentSlug: " visit ", status: "failed", limit: 999 })).toEqual({
      agentSlug: "visit",
      status: "failed",
      limit: 200,
    });
    expect(normalizeRunHistoryQuery({ status: "not-a-status", limit: 0 })).toEqual({
      agentSlug: undefined,
      status: undefined,
      limit: 1,
    });
  });

  it("passes only normalized filters to the repository", async () => {
    const store = repository();

    await listRunHistory(store, { agentSlug: " visit ", status: "success", limit: 25 });

    expect(store.list).toHaveBeenCalledWith({ agentSlug: "visit", status: "success", limit: 25 });
  });

  it("does not query a detail record for an empty id", async () => {
    const store = repository();

    await expect(getRunHistoryDetail(store, "   ")).resolves.toBeNull();
    expect(store.detail).not.toHaveBeenCalled();
  });
});
