import { describe, expect, it } from "vitest";
import { parseLiveTaskHistoryRequest, summarizeLiveTaskHistory } from "@/modules/live-task/history-rules";

describe("Live Task history rules", () => {
  it("keeps the agent query and defaults missing values", () => {
    expect(parseLiveTaskHistoryRequest("visit")).toEqual({ agentSlug: "visit" });
    expect(parseLiveTaskHistoryRequest(null)).toEqual({ agentSlug: "" });
  });

  it("preserves invite precedence, then offer outcome mapping", () => {
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

    expect(summarizeLiveTaskHistory(contacts, offers, invites)).toEqual([
      { name: "A", company: "CabLate", outcome: "已寄邀約", at: "2026-07-31T01:00:00Z" },
      { name: "B", company: null, outcome: "待核准", at: "2026-07-31T02:00:00Z" },
      { name: "C", company: null, outcome: "已辨識", at: "2026-07-31T03:00:00Z" },
    ]);
  });
});
