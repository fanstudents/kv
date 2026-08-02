import { describe, expect, it, vi } from "vitest";
import {
  createVisitLineOfferReplyHandler,
  type VisitLineOfferDependencies,
} from "@/modules/visit/line-offer-application";

function makeDependencies(overrides?: Partial<VisitLineOfferDependencies>) {
  const contact = {
    id: "contact-1",
    name: "Dennis",
    title: "Founder",
    company: "TBR",
    email: "dennis@example.test",
    phone: "0900000000",
  };
  const dependencies: VisitLineOfferDependencies = {
    workflow: {
      findPendingOffer: vi.fn().mockResolvedValue({ id: "offer-1", contact }),
      resolveOffer: vi.fn().mockResolvedValue(undefined),
      updateContactField: vi.fn().mockResolvedValue(undefined),
      findContact: vi.fn().mockResolvedValue(contact),
      createPendingInvite: vi.fn().mockResolvedValue({ id: "invite-1" }),
    },
    delivery: {
      replyText: vi.fn().mockResolvedValue(undefined),
      replyMessages: vi.fn().mockResolvedValue(undefined),
    },
    providers: {
      interpretCardReply: vi.fn().mockImplementation(({ userText }: { userText: string }) =>
        Promise.resolve({ type: userText.includes("不要") ? "cancel" : "confirm" })),
      findFreeSlots: vi.fn().mockResolvedValue([
        { label: "2026-08-01 10:00", start: "2026-08-01T10:00:00+08:00", end: "2026-08-01T11:00:00+08:00" },
        { label: "2026-08-02 14:00", start: "2026-08-02T14:00:00+08:00", end: "2026-08-02T15:00:00+08:00" },
      ]),
      draftInviteEmail: vi.fn().mockResolvedValue({ subject: "Meeting", body: "draft body" }),
      sendEmail: vi.fn().mockResolvedValue(undefined),
    },
    settings: {
      get: vi.fn().mockResolvedValue({
        rangeStartDays: 1,
        rangeEndDays: 14,
        meetingDuration: 60,
        meetingType: "咖啡",
        workingHoursStart: "09:00",
        workingHoursEnd: "18:00",
        senderName: "Dennis",
        requireApproval: true,
      }),
    },
    runtime: {
      reportVisitStep: vi.fn().mockResolvedValue(undefined),
      saveVisitArtifact: vi.fn().mockResolvedValue(undefined),
      endVisitRun: vi.fn().mockResolvedValue(undefined),
    },
    activity: { record: vi.fn().mockResolvedValue(undefined) },
    lock: { acquire: vi.fn(), release: vi.fn().mockResolvedValue(undefined) },
    tags: { list: vi.fn().mockResolvedValue(["潛在客戶", "待跟進"]), add: vi.fn() },
    formatCardReply: vi.fn().mockReturnValue("名片辨識完成 ✅"),
    renderDecisionCard: vi.fn().mockReturnValue({ type: "flex" }),
    renderTagQuickReply: vi.fn().mockReturnValue({ type: "quick-reply" }),
    renderInviteEmail: vi.fn().mockReturnValue("<html>invite</html>"),
  };
  return { dependencies: { ...dependencies, ...overrides }, contact };
}

describe("Visit LINE offer application", () => {
  it("cancels the pending offer, shows tags, and releases the Visit lock", async () => {
    const { dependencies } = makeDependencies();
    const handler = createVisitLineOfferReplyHandler(dependencies);

    await expect(handler({ replyToken: "reply-1" }, "line-user-1", "不要", "https://kv.test")).resolves.toBe(true);

    expect(dependencies.workflow.resolveOffer).toHaveBeenCalledWith("offer-1", "declined", expect.any(String));
    expect(dependencies.tags.list).toHaveBeenCalledOnce();
    expect(dependencies.delivery.replyMessages).toHaveBeenCalledWith("reply-1", [
      { type: "text", text: "好的，這次先不安排，需要的話再傳名片給我一次即可。" },
      { type: "quick-reply" },
    ]);
    expect(dependencies.renderTagQuickReply).toHaveBeenCalledWith({
      contactId: "contact-1",
      tags: ["潛在客戶", "待跟進"],
    });
    expect(dependencies.lock.release).toHaveBeenCalledWith("line-user-1", "visit");
    expect(dependencies.providers.findFreeSlots).not.toHaveBeenCalled();
  });

  it("releases the Visit lock when cancellation bookkeeping fails", async () => {
    const { dependencies } = makeDependencies();
    vi.mocked(dependencies.providers.interpretCardReply).mockResolvedValue({ type: "cancel" });
    vi.mocked(dependencies.runtime.endVisitRun).mockRejectedValue(new Error("runtime unavailable"));
    const handler = createVisitLineOfferReplyHandler(dependencies);

    await expect(handler({ replyToken: "reply-cancel-failure" }, "line-user-cancel", "cancel", "https://kv.test"))
      .rejects.toThrow("runtime unavailable");

    expect(dependencies.lock.release).toHaveBeenCalledWith("line-user-cancel", "visit");
  });

  it("creates an approval-gated invite from fresh calendar slots without sending it", async () => {
    const { dependencies } = makeDependencies();
    const handler = createVisitLineOfferReplyHandler(dependencies);

    await expect(handler({ replyToken: "reply-2" }, "line-user-2", "要", "https://kv.test")).resolves.toBe(true);

    expect(dependencies.workflow.resolveOffer).toHaveBeenCalledWith("offer-1", "accepted", expect.any(String));
    expect(dependencies.providers.findFreeSlots).toHaveBeenCalledWith({
      rangeStartDays: 1,
      rangeEndDays: 14,
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      meetingDurationMinutes: 60,
      slotCount: 2,
    });
    expect(dependencies.workflow.createPendingInvite).toHaveBeenCalledWith("line-user-2", {
      contactId: "contact-1",
      toEmail: "dennis@example.test",
      subject: "Meeting",
      body: "draft body",
      slots: [
        { label: "2026-08-01 10:00", start: "2026-08-01T10:00:00+08:00", end: "2026-08-01T11:00:00+08:00" },
        { label: "2026-08-02 14:00", start: "2026-08-02T14:00:00+08:00", end: "2026-08-02T15:00:00+08:00" },
      ],
      requiresApproval: true,
    });
    expect(dependencies.delivery.replyText).toHaveBeenCalledWith(
      "reply-2",
      expect.stringContaining("邀約信草稿已經準備好"),
    );
    expect(dependencies.activity.record).toHaveBeenCalledWith(
      expect.objectContaining({ agent_slug: "visit", status: "pending" }),
    );
    expect(dependencies.providers.sendEmail).not.toHaveBeenCalled();
    expect(dependencies.lock.release).not.toHaveBeenCalled();
  });

  it("releases the Visit lock when workflow failure telemetry also fails", async () => {
    const { dependencies } = makeDependencies({
      classifyDecisionText: vi.fn().mockReturnValue({ type: "confirm" }),
    });
    vi.mocked(dependencies.providers.draftInviteEmail).mockRejectedValue(new Error("OpenAI unavailable"));
    vi.mocked(dependencies.activity.record).mockRejectedValue(new Error("activity unavailable"));
    const handler = createVisitLineOfferReplyHandler(dependencies);

    await expect(handler({ replyToken: "reply-flow-failure" }, "line-user-flow", "confirm", "https://kv.test"))
      .rejects.toThrow("activity unavailable");

    expect(dependencies.lock.release).toHaveBeenCalledWith("line-user-flow", "visit");
  });
});
