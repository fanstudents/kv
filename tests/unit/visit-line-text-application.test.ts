import { describe, expect, it, vi } from "vitest";
import {
  createVisitLineTextHandler,
  type VisitLineTextDependencies,
} from "@/modules/visit/line-text-application";

function makeDependencies() {
  const dependencies: VisitLineTextDependencies = {
    handleInviteApprovalReply: vi.fn().mockResolvedValue(false),
    handleVisitOfferReply: vi.fn().mockResolvedValue(false),
    delivery: { replyText: vi.fn().mockResolvedValue(undefined) },
    activity: { record: vi.fn().mockResolvedValue(undefined) },
  };
  return dependencies;
}

describe("Visit LINE text application", () => {
  it("gives the pending invite approval handler first refusal", async () => {
    const dependencies = makeDependencies();
    vi.mocked(dependencies.handleInviteApprovalReply).mockResolvedValue(true);
    const handler = createVisitLineTextHandler(dependencies);

    await expect(
      handler(
        { replyToken: "reply-1", message: { text: "  寄出  " } },
        "line-user-1",
        "https://kv.test",
      ),
    ).resolves.toBeUndefined();

    expect(dependencies.handleInviteApprovalReply).toHaveBeenCalledWith(
      { replyToken: "reply-1", message: { text: "  寄出  " } },
      "line-user-1",
      "寄出",
      "https://kv.test",
    );
    expect(dependencies.handleVisitOfferReply).not.toHaveBeenCalled();
    expect(dependencies.delivery.replyText).not.toHaveBeenCalled();
  });

  it("gives the pending offer handler the second refusal", async () => {
    const dependencies = makeDependencies();
    vi.mocked(dependencies.handleVisitOfferReply).mockResolvedValue(true);
    const handler = createVisitLineTextHandler(dependencies);

    await expect(
      handler(
        { replyToken: "reply-2", message: { text: "要" } },
        "line-user-2",
        "https://kv.test",
      ),
    ).resolves.toBeUndefined();

    expect(dependencies.handleInviteApprovalReply).toHaveBeenCalledOnce();
    expect(dependencies.handleVisitOfferReply).toHaveBeenCalledOnce();
    expect(dependencies.delivery.replyText).not.toHaveBeenCalled();
  });

  it("preserves the generic fallback reply and activity record", async () => {
    const dependencies = makeDependencies();
    const handler = createVisitLineTextHandler(dependencies);

    await expect(
      handler(
        { replyToken: "reply-3", message: { text: "hello world" } },
        "line-user-3",
        "https://kv.test",
      ),
    ).resolves.toBeUndefined();

    expect(dependencies.delivery.replyText).toHaveBeenCalledWith(
      "reply-3",
      "已收到您的訊息！目前我最擅長的是名片辨識——直接傳一張名片照片給我，我會自動整理出聯絡資訊，並視需要幫您安排拜訪邀約。",
    );
    expect(dependencies.activity.record).toHaveBeenCalledWith({
      agent_slug: null,
      summary: "收到來自 line-user-3 的訊息：「hello world」，已自動回覆",
      status: "success",
    });
  });

  it("records a failed activity when the generic reply fails", async () => {
    const dependencies = makeDependencies();
    vi.mocked(dependencies.delivery.replyText).mockRejectedValue(new Error("LINE unavailable"));
    const handler = createVisitLineTextHandler(dependencies);

    await expect(
      handler(
        { replyToken: "reply-4", message: { text: "hello" } },
        "line-user-4",
        "https://kv.test",
      ),
    ).resolves.toBeUndefined();

    expect(dependencies.activity.record).toHaveBeenCalledWith({
      agent_slug: null,
      summary: "回覆來自 line-user-4 的訊息失敗：LINE unavailable",
      status: "failed",
    });
  });

  it("does nothing when the reply token is missing", async () => {
    const dependencies = makeDependencies();
    const handler = createVisitLineTextHandler(dependencies);

    await expect(handler({ message: { text: "hello" } }, "line-user-5", "https://kv.test")).resolves.toBeUndefined();

    expect(dependencies.handleInviteApprovalReply).not.toHaveBeenCalled();
    expect(dependencies.handleVisitOfferReply).not.toHaveBeenCalled();
  });
});
