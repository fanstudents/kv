import { describe, expect, it, vi } from "vitest";
import {
  createVisitLineInviteApprovalHandler,
  type VisitLineInviteApprovalDependencies,
} from "@/modules/visit/line-invite-approval-application";

function makeDependencies() {
  const invite = {
    id: "invite-1",
    body: "draft body",
    subject: "Meeting",
    slot1: "2026-08-01 10:00",
    slot2: "2026-08-02 14:00",
    contact: {
      id: "contact-1",
      name: "Dennis",
      title: "Founder",
      company: "TBR",
      email: "dennis@example.test",
      phone: "0900000000",
    },
  };
  const dependencies: VisitLineInviteApprovalDependencies = {
    workflow: {
      findPendingApprovalInvite: vi.fn().mockResolvedValue(invite),
      updateInviteStatus: vi.fn().mockResolvedValue(undefined),
      updateInviteDraft: vi.fn().mockResolvedValue(undefined),
    },
    delivery: { replyText: vi.fn().mockResolvedValue(undefined) },
    providers: {
      reviseInviteEmail: vi.fn().mockResolvedValue({ subject: "Revised", body: "Revised body" }),
      sendEmail: vi.fn().mockResolvedValue(undefined),
    },
    settings: { get: vi.fn().mockResolvedValue({ meetingType: "咖啡", senderName: "Dennis" }) },
    runtime: {
      reportVisitStep: vi.fn().mockResolvedValue(undefined),
      saveVisitArtifact: vi.fn().mockResolvedValue(undefined),
      endVisitRun: vi.fn().mockResolvedValue(undefined),
    },
    activity: { record: vi.fn().mockResolvedValue(undefined) },
    lock: { acquire: vi.fn(), release: vi.fn().mockResolvedValue(undefined) },
    renderInviteEmail: vi.fn().mockReturnValue("<html>invite</html>"),
  };
  return { dependencies, invite };
}

describe("Visit LINE invite approval application", () => {
  it("cancels the pending invite and releases the Visit lock", async () => {
    const { dependencies } = makeDependencies();
    const handler = createVisitLineInviteApprovalHandler(dependencies);

    await expect(handler({ replyToken: "reply-1" }, "line-user-1", "取消", "https://kv.test")).resolves.toBe(true);

    expect(dependencies.workflow.updateInviteStatus).toHaveBeenCalledWith("invite-1", "cancelled");
    expect(dependencies.delivery.replyText).toHaveBeenCalledWith("reply-1", "好的，已取消，不會寄出這封信。");
    expect(dependencies.lock.release).toHaveBeenCalledWith("line-user-1", "visit");
    expect(dependencies.providers.sendEmail).not.toHaveBeenCalled();
  });

  it("releases the Visit lock when the cancellation reply fails", async () => {
    const { dependencies } = makeDependencies();
    dependencies.classifyApprovalText = vi.fn().mockReturnValue({ type: "cancel" });
    vi.mocked(dependencies.delivery.replyText).mockRejectedValue(new Error("LINE unavailable"));
    const handler = createVisitLineInviteApprovalHandler(dependencies);

    await expect(handler({ replyToken: "reply-cancel-failure" }, "line-user-cancel", "cancel", "https://kv.test"))
      .rejects.toThrow("LINE unavailable");

    expect(dependencies.lock.release).toHaveBeenCalledWith("line-user-cancel", "visit");
  });

  it("sends an approved invite through injected providers and records the outcome", async () => {
    const { dependencies } = makeDependencies();
    const handler = createVisitLineInviteApprovalHandler(dependencies);

    await expect(handler({ replyToken: "reply-2" }, "line-user-2", "寄出", "https://kv.test")).resolves.toBe(true);

    expect(dependencies.renderInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        introText: "draft body",
        senderName: "Dennis",
        respondUrl1: "https://kv.test/api/agents/visit/respond?invite=invite-1&choice=1",
      }),
    );
    expect(dependencies.providers.sendEmail).toHaveBeenCalledWith({
      to: "dennis@example.test",
      subject: "Meeting",
      body: "<html>invite</html>",
      html: true,
    });
    expect(dependencies.workflow.updateInviteStatus).toHaveBeenCalledWith("invite-1", "pending");
    expect(dependencies.runtime.endVisitRun).toHaveBeenCalledWith({
      userId: "line-user-2",
      status: "success",
      summary: "已寄出邀約信給 Dennis",
    });
    expect(dependencies.activity.record).toHaveBeenCalledWith(
      expect.objectContaining({ agent_slug: "visit", status: "pending" }),
    );
    expect(dependencies.lock.release).toHaveBeenCalledWith("line-user-2", "visit");
  });

  it("releases the Visit lock even when approval failure cleanup also fails", async () => {
    const { dependencies } = makeDependencies();
    dependencies.classifyApprovalText = vi.fn().mockReturnValue({ type: "send" });
    vi.mocked(dependencies.providers.sendEmail).mockRejectedValue(new Error("Gmail unavailable"));
    vi.mocked(dependencies.workflow.updateInviteStatus).mockRejectedValue(new Error("status unavailable"));
    const handler = createVisitLineInviteApprovalHandler(dependencies);

    await expect(handler({ replyToken: "reply-failure" }, "line-user-failure", "send", "https://kv.test"))
      .rejects.toThrow("status unavailable");

    expect(dependencies.workflow.updateInviteStatus).toHaveBeenCalledWith("invite-1", "failed");
    expect(dependencies.lock.release).toHaveBeenCalledWith("line-user-failure", "visit");
  });
});
