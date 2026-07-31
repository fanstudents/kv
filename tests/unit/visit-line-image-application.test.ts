import { describe, expect, it, vi } from "vitest";
import {
  createVisitLineImageHandler,
  type VisitLineImageDependencies,
} from "@/modules/visit/line-image-application";

function makeDependencies() {
  const contact = {
    name: "Dennis",
    company: "TBR",
    title: "Founder",
    email: "dennis@example.test",
    phone: "0900000000",
  };
  const dependencies: VisitLineImageDependencies = {
    image: {
      getImageDataUrl: vi.fn().mockResolvedValue("data:image/png;base64,abc"),
      parseBusinessCard: vi.fn().mockResolvedValue(contact),
    },
    delivery: {
      replyText: vi.fn().mockResolvedValue(undefined),
      replyMessages: vi.fn().mockResolvedValue(undefined),
    },
    workflow: {
      createContact: vi.fn().mockResolvedValue({ id: "contact-1" }),
      createOffer: vi.fn().mockResolvedValue({ id: "offer-1" }),
    },
    tags: {
      list: vi.fn().mockResolvedValue(["潛在客戶", "待跟進"]),
      add: vi.fn(),
    },
    activity: { record: vi.fn().mockResolvedValue(undefined) },
    lock: {
      acquire: vi.fn().mockResolvedValue({ ok: true }),
      release: vi.fn().mockResolvedValue(undefined),
    },
    runtime: {
      startVisitRun: vi.fn().mockResolvedValue("run-1"),
      reportVisitStep: vi.fn().mockResolvedValue(undefined),
      endVisitRun: vi.fn().mockResolvedValue(undefined),
    },
    formatCardReply: vi.fn().mockReturnValue("名片辨識完成 ✅"),
    renderDecisionCard: vi.fn().mockReturnValue({ type: "decision-card" }),
    renderTagQuickReply: vi.fn().mockReturnValue({ type: "tag-quick-reply" }),
  };
  return { dependencies, contact };
}

describe("Visit LINE image application", () => {
  it("creates a contact and pending offer after a recognized email card", async () => {
    const { dependencies } = makeDependencies();
    const handler = createVisitLineImageHandler(dependencies);

    await expect(handler({ replyToken: "reply-1", message: { id: "message-1" } }, "line-user-1")).resolves.toBeUndefined();

    expect(dependencies.runtime.startVisitRun).toHaveBeenCalledWith({
      userId: "line-user-1",
      messageId: "message-1",
      summary: "LINE 傳入名片，開始辨識",
    });
    expect(dependencies.workflow.createContact).toHaveBeenCalledWith(
      {
        name: "Dennis",
        company: "TBR",
        title: "Founder",
        email: "dennis@example.test",
        phone: "0900000000",
      },
      "line-user-1",
    );
    expect(dependencies.workflow.createOffer).toHaveBeenCalledWith("line-user-1", "contact-1");
    expect(dependencies.delivery.replyMessages).toHaveBeenCalledWith("reply-1", [
      { type: "text", text: "名片辨識完成 ✅\n\n有欄位不對就直接回覆修正（例如「Email 應該是 abc@xyz.com」），我會更新後再問一次。" },
      { type: "decision-card" },
    ]);
    expect(dependencies.renderDecisionCard).toHaveBeenCalledWith({
      offerId: "offer-1",
      name: "Dennis",
      company: "TBR",
    });
    expect(dependencies.lock.acquire).toHaveBeenCalledWith("line-user-1", "visit", {
      context: { stage: "card_review" },
    });
    expect(dependencies.lock.release).not.toHaveBeenCalled();
  });

  it("shows tags and releases the lock when a card has no email", async () => {
    const { dependencies } = makeDependencies();
    vi.mocked(dependencies.image.parseBusinessCard).mockResolvedValue({
      name: "Dennis",
      company: "TBR",
      title: "Founder",
      email: "",
      phone: "0900000000",
    });
    const handler = createVisitLineImageHandler(dependencies);

    await expect(handler({ replyToken: "reply-2", message: { id: "message-2" } }, "line-user-2")).resolves.toBeUndefined();

    expect(dependencies.workflow.createOffer).not.toHaveBeenCalled();
    expect(dependencies.tags.list).toHaveBeenCalledOnce();
    expect(dependencies.renderTagQuickReply).toHaveBeenCalledWith({
      contactId: "contact-1",
      tags: ["潛在客戶", "待跟進"],
    });
    expect(dependencies.delivery.replyMessages).toHaveBeenCalledWith("reply-2", [
      {
        type: "text",
        text: "名片辨識完成 ✅\n\n這張名片沒有 Email，暫時無法自動安排拜訪邀約，需要的話可以手動聯繫對方。",
      },
      { type: "tag-quick-reply" },
    ]);
    expect(dependencies.lock.release).toHaveBeenCalledWith("line-user-2", "visit");
  });

  it("keeps the non-image reply outside the runtime flow", async () => {
    const { dependencies } = makeDependencies();
    vi.mocked(dependencies.image.getImageDataUrl).mockResolvedValue("data:application/pdf;base64,abc");
    const handler = createVisitLineImageHandler(dependencies);

    await expect(handler({ replyToken: "reply-3", message: { id: "message-3" } }, "line-user-3")).resolves.toBeUndefined();

    expect(dependencies.delivery.replyText).toHaveBeenCalledWith(
      "reply-3",
      "這個檔案不是圖片格式，請直接傳名片照片給我。",
    );
    expect(dependencies.runtime.startVisitRun).not.toHaveBeenCalled();
    expect(dependencies.workflow.createContact).not.toHaveBeenCalled();
  });

  it("records a failed run and keeps reply errors best effort", async () => {
    const { dependencies } = makeDependencies();
    vi.mocked(dependencies.image.parseBusinessCard).mockRejectedValue(new Error("Vision unavailable"));
    const handler = createVisitLineImageHandler(dependencies);

    await expect(handler({ replyToken: "reply-4", message: { id: "message-4" } }, "line-user-4")).resolves.toBeUndefined();

    expect(dependencies.activity.record).toHaveBeenCalledWith({
      agent_slug: "visit",
      summary: "LINE 名片辨識失敗：Vision unavailable（來自 line-user-4）",
      status: "failed",
    });
    expect(dependencies.runtime.endVisitRun).toHaveBeenCalledWith({
      userId: "line-user-4",
      status: "failed",
      summary: "名片辨識失敗：Vision unavailable",
      errorDetail: "Vision unavailable",
    });
    expect(dependencies.delivery.replyText).toHaveBeenCalledWith(
      "reply-4",
      "抱歉，名片辨識過程發生問題，請稍後再傳一次試試。",
    );
    expect(dependencies.workflow.createContact).not.toHaveBeenCalled();
  });
});
