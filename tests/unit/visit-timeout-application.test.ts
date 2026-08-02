import { describe, expect, it, vi } from "vitest";

import { runVisitTimeoutApplication } from "@/modules/visit/timeout-application";

const now = new Date("2026-07-31T12:00:00.000Z");

function createDependencies() {
  return {
    workflow: {
      findStaleOffers: vi.fn(),
      resolveOffer: vi.fn().mockResolvedValue(undefined),
    },
    tags: { add: vi.fn().mockResolvedValue([]) },
    activity: { record: vi.fn().mockResolvedValue(undefined) },
    liveTask: { setState: vi.fn().mockResolvedValue(undefined) },
    delivery: { pushText: vi.fn().mockResolvedValue(undefined) },
    lock: { release: vi.fn().mockResolvedValue(undefined) },
    clock: { now: vi.fn(() => now) },
  };
}

describe("Visit timeout application", () => {
  it("keeps the stale-offer window and runs each legacy side effect in order", async () => {
    const dependencies = createDependencies();
    dependencies.workflow.findStaleOffers.mockResolvedValue([
      { id: "offer-1", lineUserId: "line-1", contactId: "contact-1", contactName: "Alice" },
      { id: "offer-2", lineUserId: null, contactId: null, contactName: null },
    ]);

    await expect(runVisitTimeoutApplication(dependencies)).resolves.toBe(2);

    expect(dependencies.workflow.findStaleOffers).toHaveBeenCalledWith({
      olderThan: "2026-07-31T11:57:00.000Z",
      notOlderThan: "2026-07-31T11:40:00.000Z",
      limit: 20,
    });
    expect(dependencies.workflow.resolveOffer).toHaveBeenNthCalledWith(
      1,
      "offer-1",
      "timed_out",
      "2026-07-31T12:00:00.000Z"
    );
    expect(dependencies.workflow.resolveOffer).toHaveBeenNthCalledWith(
      2,
      "offer-2",
      "timed_out",
      "2026-07-31T12:00:00.000Z"
    );
    expect(dependencies.tags.add).toHaveBeenCalledOnce();
    expect(dependencies.tags.add).toHaveBeenCalledWith("contact-1", "待跟進");
    expect(dependencies.activity.record).toHaveBeenNthCalledWith(1, {
      agent_slug: "visit",
      summary: "名片「Alice」逾時未回覆（3 分鐘），已自動略過並標記「待跟進」",
      status: "success",
    });
    expect(dependencies.activity.record).toHaveBeenNthCalledWith(2, {
      agent_slug: "visit",
      summary: "名片「這位客戶」逾時未回覆（3 分鐘），已自動略過並標記「待跟進」",
      status: "success",
    });
    expect(dependencies.liveTask.setState).toHaveBeenNthCalledWith(1, "visit", {
      step: 2,
      status: "done",
      caption: "逾時未回覆，已標記待跟進（Alice）",
    });
    expect(dependencies.liveTask.setState).toHaveBeenNthCalledWith(2, "visit", {
      step: 2,
      status: "done",
      caption: "逾時未回覆，已標記待跟進（這位客戶）",
    });
    expect(dependencies.delivery.pushText).toHaveBeenCalledWith(
      "line-1",
      "名片「Alice」等了 3 分鐘沒收到你的指示，我先幫你標記「待跟進」存起來了 📌\n要安排拜訪的話再跟我說，或重新傳一次名片即可。"
    );
    expect(dependencies.lock.release).toHaveBeenCalledWith("line-1", "visit");
    expect(dependencies.delivery.pushText).toHaveBeenCalledOnce();
    expect(dependencies.lock.release).toHaveBeenCalledOnce();
  });

  it("keeps delivery and lock failures best effort", async () => {
    const dependencies = createDependencies();
    dependencies.workflow.findStaleOffers.mockResolvedValue([
      { id: "offer-1", lineUserId: "line-1", contactId: null, contactName: "Alice" },
    ]);
    dependencies.delivery.pushText.mockRejectedValue(new Error("LINE unavailable"));
    dependencies.lock.release.mockRejectedValue(new Error("lock unavailable"));

    await expect(runVisitTimeoutApplication(dependencies)).resolves.toBe(1);
    expect(dependencies.workflow.resolveOffer).toHaveBeenCalledOnce();
    expect(dependencies.activity.record).toHaveBeenCalledOnce();
    expect(dependencies.liveTask.setState).toHaveBeenCalledOnce();
  });

  it("releases the conversation lock after a terminal status even when later work fails", async () => {
    const dependencies = createDependencies();
    dependencies.workflow.findStaleOffers.mockResolvedValue([
      { id: "offer-1", lineUserId: "line-1", contactId: "contact-1", contactName: "Alice" },
    ]);
    dependencies.activity.record.mockRejectedValue(new Error("activity unavailable"));

    await expect(runVisitTimeoutApplication(dependencies)).rejects.toThrow("activity unavailable");

    expect(dependencies.workflow.resolveOffer).toHaveBeenCalledOnce();
    expect(dependencies.lock.release).toHaveBeenCalledWith("line-1", "visit");
    expect(dependencies.delivery.pushText).not.toHaveBeenCalled();
  });

  it("does not perform side effects when there are no stale offers", async () => {
    const dependencies = createDependencies();
    dependencies.workflow.findStaleOffers.mockResolvedValue([]);

    await expect(runVisitTimeoutApplication(dependencies)).resolves.toBe(0);
    expect(dependencies.workflow.resolveOffer).not.toHaveBeenCalled();
    expect(dependencies.activity.record).not.toHaveBeenCalled();
    expect(dependencies.liveTask.setState).not.toHaveBeenCalled();
  });
});
