import { describe, expect, it, vi } from "vitest";
import {
  createVisitLinePostbackHandler,
  type VisitLinePostbackDependencies,
} from "@/modules/visit/line-postback-application";

function makeDependencies() {
  const dependencies: VisitLinePostbackDependencies = {
    handleVisitOfferReply: vi.fn().mockResolvedValue(true),
    tags: { add: vi.fn().mockResolvedValue(["潛在客戶"]) },
    delivery: { replyText: vi.fn().mockResolvedValue(undefined) },
  };
  return dependencies;
}

describe("Visit LINE postback application", () => {
  it("maps confirm and cancel postbacks to the existing offer decisions", async () => {
    const dependencies = makeDependencies();
    const handler = createVisitLinePostbackHandler(dependencies);

    await expect(
      handler(
        { replyToken: "reply-confirm", postback: { data: "action=confirm" } },
        "line-user-1",
        "https://kv.test",
      ),
    ).resolves.toBeUndefined();
    await expect(
      handler(
        { replyToken: "reply-cancel", postback: { data: "action=cancel" } },
        "line-user-1",
        "https://kv.test",
      ),
    ).resolves.toBeUndefined();

    expect(dependencies.handleVisitOfferReply).toHaveBeenNthCalledWith(
      1,
      { replyToken: "reply-confirm", postback: { data: "action=confirm" } },
      "line-user-1",
      "要",
      "https://kv.test",
    );
    expect(dependencies.handleVisitOfferReply).toHaveBeenNthCalledWith(
      2,
      { replyToken: "reply-cancel", postback: { data: "action=cancel" } },
      "line-user-1",
      "不要",
      "https://kv.test",
    );
    expect(dependencies.delivery.replyText).not.toHaveBeenCalled();
  });

  it("adds a tag and replies with the updated tag list", async () => {
    const dependencies = makeDependencies();
    const handler = createVisitLinePostbackHandler(dependencies);

    await expect(
      handler(
        { replyToken: "reply-tag", postback: { data: "action=tag&contact=contact-1&value=潛在客戶" } },
        "line-user-2",
        "https://kv.test",
      ),
    ).resolves.toBeUndefined();

    expect(dependencies.tags.add).toHaveBeenCalledWith("contact-1", "潛在客戶");
    expect(dependencies.delivery.replyText).toHaveBeenCalledWith(
      "reply-tag",
      "已標上「潛在客戶」✅\n目前標籤：潛在客戶",
    );
    expect(dependencies.handleVisitOfferReply).not.toHaveBeenCalled();
  });

  it("preserves the tag-done acknowledgement and ignores incomplete/unknown actions", async () => {
    const dependencies = makeDependencies();
    const handler = createVisitLinePostbackHandler(dependencies);

    await expect(
      handler(
        { replyToken: "reply-done", postback: { data: "action=tag_done" } },
        "line-user-3",
        "https://kv.test",
      ),
    ).resolves.toBeUndefined();
    await expect(
      handler(
        { replyToken: "reply-missing", postback: { data: "action=tag&contact=contact-1" } },
        "line-user-3",
        "https://kv.test",
      ),
    ).resolves.toBeUndefined();
    await expect(
      handler(
        { replyToken: "reply-unknown", postback: { data: "action=other" } },
        "line-user-3",
        "https://kv.test",
      ),
    ).resolves.toBeUndefined();

    expect(dependencies.delivery.replyText).toHaveBeenCalledWith(
      "reply-done",
      "好的，標籤完成 👍 有需要再傳名片給我。",
    );
    expect(dependencies.tags.add).not.toHaveBeenCalled();
    expect(dependencies.handleVisitOfferReply).not.toHaveBeenCalled();
  });

  it("does nothing when the postback reply token is missing", async () => {
    const dependencies = makeDependencies();
    const handler = createVisitLinePostbackHandler(dependencies);

    await expect(handler({ postback: { data: "action=confirm" } }, "line-user-4", "https://kv.test")).resolves.toBeUndefined();

    expect(dependencies.handleVisitOfferReply).not.toHaveBeenCalled();
    expect(dependencies.tags.add).not.toHaveBeenCalled();
    expect(dependencies.delivery.replyText).not.toHaveBeenCalled();
  });
});
