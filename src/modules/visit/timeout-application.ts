import type { ConversationLockPort } from "@/modules/conversation/lock-ports";
import type { ContactTagPort } from "@/modules/contacts/tag-ports";
import type { LiveTaskUpdatePort } from "@/modules/live-task/update-ports";
import type { VisitLineActivityPort } from "@/modules/visit/line-activity-ports";
import type { VisitLineDeliveryPort } from "@/modules/visit/line-delivery-ports";
import type { VisitLineWorkflowPersistencePort } from "@/modules/visit/line-workflow-ports";

export interface VisitTimeoutClock {
  now(): Date;
}

const VISIT_TIMEOUT_AGE_MS = 3 * 60 * 1000;
const VISIT_TIMEOUT_LOOKBACK_MS = 20 * 60 * 1000;
const VISIT_TIMEOUT_BATCH_SIZE = 20;

export interface VisitTimeoutApplicationDependencies {
  workflow: Pick<VisitLineWorkflowPersistencePort, "findStaleOffers" | "resolveOffer">;
  tags: Pick<ContactTagPort, "add">;
  activity: VisitLineActivityPort;
  liveTask: Pick<LiveTaskUpdatePort, "setState">;
  delivery: Pick<VisitLineDeliveryPort, "pushText">;
  lock: Pick<ConversationLockPort, "release">;
  clock?: VisitTimeoutClock;
}

const systemClock: VisitTimeoutClock = {
  now: () => new Date(),
};

export async function runVisitTimeoutApplication(
  dependencies: VisitTimeoutApplicationDependencies
): Promise<number> {
  const clock = dependencies.clock ?? systemClock;
  const now = clock.now().getTime();
  const olderThan = new Date(now - VISIT_TIMEOUT_AGE_MS).toISOString();
  const notOlderThan = new Date(now - VISIT_TIMEOUT_LOOKBACK_MS).toISOString();

  const staleOffers = await dependencies.workflow.findStaleOffers({
    olderThan,
    notOlderThan,
    limit: VISIT_TIMEOUT_BATCH_SIZE,
  });

  let handled = 0;
  for (const offer of staleOffers) {
    const name = offer.contactName ?? "這位客戶";

    await dependencies.workflow.resolveOffer(offer.id, "timed_out", clock.now().toISOString());

    if (offer.contactId) await dependencies.tags.add(offer.contactId, "待跟進");

    await dependencies.activity.record({
      agent_slug: "visit",
      summary: `名片「${name}」逾時未回覆（3 分鐘），已自動略過並標記「待跟進」`,
      status: "success",
    });

    await dependencies.liveTask.setState("visit", {
      step: 2,
      status: "done",
      caption: `逾時未回覆，已標記待跟進（${name}）`,
    });

    if (offer.lineUserId) {
      await dependencies.delivery
        .pushText(
          offer.lineUserId,
          `名片「${name}」等了 3 分鐘沒收到你的指示，我先幫你標記「待跟進」存起來了 📌\n要安排拜訪的話再跟我說，或重新傳一次名片即可。`
        )
        .catch(() => {});
      await dependencies.lock.release(offer.lineUserId, "visit").catch(() => {});
    }

    handled++;
  }

  return handled;
}
