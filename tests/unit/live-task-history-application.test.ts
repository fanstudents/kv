import { describe, expect, it, vi } from "vitest";
import { runLiveTaskHistory } from "@/modules/live-task/history-application";

describe("Live Task history application", () => {
  it("returns an empty list for non-Visit agents without reading storage", async () => {
    const port = {
      listContacts: vi.fn(),
      listOffers: vi.fn(),
      listInvites: vi.fn(),
    };

    await expect(runLiveTaskHistory({ agentSlug: "teamlead" }, port)).resolves.toEqual({ items: [] });
    expect(port.listContacts).not.toHaveBeenCalled();
  });

  it("loads contacts and both relation sources with the existing limit", async () => {
    const port = {
      listContacts: vi.fn().mockResolvedValue([
        { id: "c1", name: "A", company: null, createdAt: "2026-07-31T01:00:00Z" },
      ]),
      listOffers: vi.fn().mockResolvedValue([{ contactId: "c1", status: "accepted", createdAt: "2026-07-31T02:00:00Z" }]),
      listInvites: vi.fn().mockResolvedValue([]),
    };

    await expect(runLiveTaskHistory({ agentSlug: "visit" }, port)).resolves.toEqual({
      items: [{ name: "A", company: null, outcome: "已確認", at: "2026-07-31T01:00:00Z" }],
    });
    expect(port.listContacts).toHaveBeenCalledWith(8);
    expect(port.listOffers).toHaveBeenCalledWith(["c1"]);
    expect(port.listInvites).toHaveBeenCalledWith(["c1"]);
  });

  it("swallows legacy provider failures and returns the existing fallback", async () => {
    const port = {
      listContacts: vi.fn().mockRejectedValue(new Error("database down")),
      listOffers: vi.fn(),
      listInvites: vi.fn(),
    };

    await expect(runLiveTaskHistory({ agentSlug: "visit" }, port)).resolves.toEqual({ items: [] });
  });
});
