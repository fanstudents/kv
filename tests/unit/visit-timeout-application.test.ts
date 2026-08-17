import { describe, expect, it, vi } from "vitest";

import { runVisitTimeoutApplication } from "@/modules/visit/timeout-application";

const now = new Date("2026-07-31T12:00:00.000Z");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createDependencies() {
  return {
    workflow: {
      findStaleOffers: vi.fn(),
      resolveOffer: vi.fn().mockResolvedValue(undefined),
      markTimeoutPhase: vi.fn().mockResolvedValue(undefined),
      recordTimeoutError: vi.fn().mockResolvedValue(undefined),
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
      "名片「Alice」等了 3 分鐘沒收到你的指示，我先幫你標記「待跟進」存起來了 📌\n要安排拜訪的話再跟我說，或重新傳一次名片即可。",
      "offer-1",
    );
    expect(dependencies.lock.release).toHaveBeenCalledWith("line-1", "visit");
    expect(dependencies.delivery.pushText).toHaveBeenCalledOnce();
    expect(dependencies.lock.release).toHaveBeenCalledOnce();
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(1, "offer-1", "activity_recorded");
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(2, "offer-1", "line_notified");
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(3, "offer-1", "completed");
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(4, "offer-2", "activity_recorded");
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(5, "offer-2", "line_notified");
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(6, "offer-2", "completed");
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
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenCalledWith("offer-1", "activity_recorded");
    expect(dependencies.workflow.markTimeoutPhase).not.toHaveBeenCalledWith("offer-1", "line_notified");
    expect(dependencies.workflow.recordTimeoutError).toHaveBeenCalledWith("offer-1", "LINE unavailable");
  });

  it("releases the conversation lock after a terminal status even when later work fails", async () => {
    const dependencies = createDependencies();
    dependencies.workflow.findStaleOffers.mockResolvedValue([
      { id: "offer-1", lineUserId: "line-1", contactId: "contact-1", contactName: "Alice" },
    ]);
    dependencies.activity.record.mockRejectedValue(new Error("activity unavailable"));

    await expect(runVisitTimeoutApplication(dependencies)).resolves.toBe(1);

    expect(dependencies.workflow.resolveOffer).toHaveBeenCalledOnce();
    expect(dependencies.lock.release).toHaveBeenCalledWith("line-1", "visit");
    expect(dependencies.delivery.pushText).not.toHaveBeenCalled();
    expect(dependencies.workflow.markTimeoutPhase).not.toHaveBeenCalled();
    expect(dependencies.workflow.recordTimeoutError).toHaveBeenCalledWith("offer-1", "activity unavailable");
  });

  it("resumes after the activity checkpoint without repeating the audit or tag step", async () => {
    const dependencies = createDependencies();
    dependencies.workflow.findStaleOffers.mockResolvedValue([
      {
        id: "offer-1",
        lineUserId: "line-1",
        contactId: "contact-1",
        contactName: "Alice",
        timeoutPhase: "activity_recorded",
      },
    ]);

    await expect(runVisitTimeoutApplication(dependencies)).resolves.toBe(1);

    expect(dependencies.workflow.resolveOffer).not.toHaveBeenCalled();
    expect(dependencies.tags.add).not.toHaveBeenCalled();
    expect(dependencies.activity.record).not.toHaveBeenCalled();
    expect(dependencies.delivery.pushText).toHaveBeenCalledOnce();
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(1, "offer-1", "line_notified");
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(2, "offer-1", "completed");
  });

  it("reuses the offer UUID retry key when the notification checkpoint must recover", async () => {
    const dependencies = createDependencies();
    const offerId = "550e8400-e29b-41d4-a716-446655440000";
    const offer = {
      id: offerId,
      lineUserId: "line-1",
      contactId: "contact-1",
      contactName: "Alice",
    };
    dependencies.workflow.findStaleOffers
      .mockResolvedValueOnce([offer])
      .mockResolvedValueOnce([{ ...offer, timeoutPhase: "activity_recorded" }]);
    dependencies.workflow.markTimeoutPhase
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("checkpoint unavailable"))
      .mockResolvedValue(undefined);
    // Models the transport resolving LINE's duplicate-accepted 409 as an
    // already-completed delivery on the recovery run.
    dependencies.delivery.pushText
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    await expect(runVisitTimeoutApplication(dependencies)).resolves.toBe(1);
    await expect(runVisitTimeoutApplication(dependencies)).resolves.toBe(1);

    expect(dependencies.workflow.resolveOffer).toHaveBeenCalledOnce();
    expect(dependencies.tags.add).toHaveBeenCalledOnce();
    expect(dependencies.activity.record).toHaveBeenCalledOnce();
    expect(dependencies.delivery.pushText).toHaveBeenCalledTimes(2);
    expect(dependencies.delivery.pushText.mock.calls[0]).toEqual(
      dependencies.delivery.pushText.mock.calls[1],
    );
    expect(dependencies.delivery.pushText.mock.calls[0][2]).toBe(offerId);
    expect(dependencies.delivery.pushText.mock.calls[0][2]).toMatch(UUID_PATTERN);
    expect(dependencies.workflow.recordTimeoutError).toHaveBeenCalledWith(
      offerId,
      "checkpoint unavailable",
    );
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(
      1,
      offerId,
      "activity_recorded",
    );
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(2, offerId, "line_notified");
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(3, offerId, "line_notified");
    expect(dependencies.workflow.markTimeoutPhase).toHaveBeenNthCalledWith(4, offerId, "completed");
  });

  it("uses distinct UUID retry keys for distinct timeout offers", async () => {
    const dependencies = createDependencies();
    const firstOfferId = "550e8400-e29b-41d4-a716-446655440000";
    const secondOfferId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
    dependencies.workflow.findStaleOffers.mockResolvedValue([
      { id: firstOfferId, lineUserId: "line-1", contactId: null, contactName: "Alice" },
      { id: secondOfferId, lineUserId: "line-2", contactId: null, contactName: "Bob" },
    ]);

    await expect(runVisitTimeoutApplication(dependencies)).resolves.toBe(2);

    const retryKeys = dependencies.delivery.pushText.mock.calls.map((call) => call[2]);
    expect(retryKeys).toEqual([firstOfferId, secondOfferId]);
    expect(retryKeys[0]).toMatch(UUID_PATTERN);
    expect(retryKeys[1]).toMatch(UUID_PATTERN);
    expect(new Set(retryKeys).size).toBe(2);
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
