import { describe, expect, it, vi } from "vitest";
import {
  parseVisitLiveTaskHistoryRequest,
  readVisitLiveTaskHistory,
  summarizeVisitLiveTaskHistory,
} from "@/modules/live-task/visit-history";

describe("Visit live task history projection", () => {
  it("keeps the agent query and defaults missing values", () => {
    expect(parseVisitLiveTaskHistoryRequest("visit")).toEqual({ agentSlug: "visit" });
    expect(parseVisitLiveTaskHistoryRequest(null)).toEqual({ agentSlug: "" });
  });

  it("preserves invite precedence and offer outcome mapping", () => {
    const contacts = [
      { id: "c1", name: "A", company: "CabLate", createdAt: "2026-07-31T01:00:00Z" },
      { id: "c2", name: "B", company: null, createdAt: "2026-07-31T02:00:00Z" },
      { id: "c3", name: "C", company: null, createdAt: "2026-07-31T03:00:00Z" },
    ];
    const offers = [
      { contactId: "c1", status: "accepted", createdAt: "2026-07-31T04:00:00Z" },
      { contactId: "c2", status: "pending", createdAt: "2026-07-31T05:00:00Z" },
    ];
    const invites = [
      { contactId: "c1", status: "confirmed", createdAt: "2026-07-31T06:00:00Z" },
      { contactId: "c2", status: "awaiting_approval", createdAt: "2026-07-31T07:00:00Z" },
    ];

    expect(summarizeVisitLiveTaskHistory(contacts, offers, invites)).toEqual([
      { name: "A", company: "CabLate", outcome: "已寄邀約", at: "2026-07-31T01:00:00Z" },
      { name: "B", company: null, outcome: "待核准", at: "2026-07-31T02:00:00Z" },
      { name: "C", company: null, outcome: "已辨識", at: "2026-07-31T03:00:00Z" },
    ]);
  });

  it("returns empty for a non-Visit agent without reading storage", async () => {
    const repository = { listContacts: vi.fn(), listOffers: vi.fn(), listInvites: vi.fn() };
    await expect(readVisitLiveTaskHistory({ agentSlug: "teamlead" }, repository)).resolves.toEqual({ items: [] });
    expect(repository.listContacts).not.toHaveBeenCalled();
  });

  it("loads contacts and both relation sources with the existing limit", async () => {
    const repository = {
      listContacts: vi.fn(async () => [{ id: "c1", name: "A", company: null, createdAt: "2026-07-31T01:00:00Z" }]),
      listOffers: vi.fn(async () => [{ contactId: "c1", status: "accepted", createdAt: "2026-07-31T02:00:00Z" }]),
      listInvites: vi.fn(async () => []),
    };

    await expect(readVisitLiveTaskHistory({ agentSlug: "visit" }, repository)).resolves.toEqual({
      items: [{ name: "A", company: null, outcome: "已確認", at: "2026-07-31T01:00:00Z" }],
    });
    expect(repository.listContacts).toHaveBeenCalledWith(8);
    expect(repository.listOffers).toHaveBeenCalledWith(["c1"]);
    expect(repository.listInvites).toHaveBeenCalledWith(["c1"]);
  });

  it("swallows provider failure and keeps the empty fallback", async () => {
    const repository = {
      listContacts: vi.fn(async () => { throw new Error("database down"); }),
      listOffers: vi.fn(),
      listInvites: vi.fn(),
    };
    await expect(readVisitLiveTaskHistory({ agentSlug: "visit" }, repository)).resolves.toEqual({ items: [] });
  });
});
