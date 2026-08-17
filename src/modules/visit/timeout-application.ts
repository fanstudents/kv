import type { ConversationLockPort } from "@/modules/conversation/lock-ports";
import type { ContactTagPort } from "@/modules/operations/service";
import type { LiveTaskStateRepository } from "@/modules/live-task/state";
import type { LegacyVisitTimeoutPhase } from "@/modules/visit/legacy-schema";
import type {
  VisitLineActivityPort,
  VisitLineDeliveryPort,
  VisitLineWorkflowPersistencePort,
} from "@/modules/visit/line-contracts";

export interface VisitTimeoutClock {
  now(): Date;
}

const VISIT_TIMEOUT_AGE_MS = 3 * 60 * 1000;
const VISIT_TIMEOUT_LOOKBACK_MS = 20 * 60 * 1000;
const VISIT_TIMEOUT_BATCH_SIZE = 20;

export interface VisitTimeoutApplicationDependencies {
  workflow: Pick<
    VisitLineWorkflowPersistencePort,
    "findStaleOffers" | "resolveOffer" | "markTimeoutPhase" | "recordTimeoutError"
  >;
  tags: Pick<ContactTagPort, "add">;
  activity: VisitLineActivityPort;
  liveTask: Pick<LiveTaskStateRepository, "setState">;
  delivery: Pick<VisitLineDeliveryPort, "pushText">;
  lock: Pick<ConversationLockPort, "release">;
  clock?: VisitTimeoutClock;
}

const systemClock: VisitTimeoutClock = {
  now: () => new Date(),
};

const TIMEOUT_PHASE_ORDER: Record<LegacyVisitTimeoutPhase, number> = {
  resolved: 0,
  activity_recorded: 1,
  line_notified: 2,
  completed: 3,
};

function phaseReached(
  current: LegacyVisitTimeoutPhase | null,
  required: LegacyVisitTimeoutPhase,
): boolean {
  return current !== null && TIMEOUT_PHASE_ORDER[current] >= TIMEOUT_PHASE_ORDER[required];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Visit timeout side effect failed";
}

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
    let phase = offer.timeoutPhase;
    try {
      if (!phase) {
        await dependencies.workflow.resolveOffer(offer.id, "timed_out", clock.now().toISOString());
        phase = "resolved";
      }

      // addContactTag is read-before-write and already ignores an existing tag,
      // so re-running this step is safe when the checkpoint write was interrupted.
      if (!phaseReached(phase, "activity_recorded")) {
        if (offer.contactId) await dependencies.tags.add(offer.contactId, "待跟進");

        await dependencies.activity.record({
          agent_slug: "visit",
          summary: `名片「${name}」逾時未回覆（3 分鐘），已自動略過並標記「待跟進」`,
          status: "success",
        });
        await dependencies.workflow.markTimeoutPhase(offer.id, "activity_recorded");
        phase = "activity_recorded";
      }

      // Live task is a UI projection. A stale projection must not block the
      // durable timeout or the user notification.
      await dependencies.liveTask
        .setState("visit", {
          step: 2,
          status: "done",
          caption: `逾時未回覆，已標記待跟進（${name}）`,
        })
        .catch((error) => console.error("[visit-timeout] live task projection failed", error));

      if (!phaseReached(phase, "line_notified") && offer.lineUserId) {
        // visit_offers.id is a persisted UUID, so it remains stable across
        // recovery attempts while remaining distinct for each offer.
        await dependencies.delivery
          .pushText(
            offer.lineUserId,
            `名片「${name}」等了 3 分鐘沒收到你的指示，我先幫你標記「待跟進」存起來了 📌\n要安排拜訪的話再跟我說，或重新傳一次名片即可。`,
            offer.id,
          );
        await dependencies.workflow.markTimeoutPhase(offer.id, "line_notified");
        phase = "line_notified";
      } else if (!phaseReached(phase, "line_notified")) {
        await dependencies.workflow.markTimeoutPhase(offer.id, "line_notified");
        phase = "line_notified";
      }

      if (!phaseReached(phase, "completed")) {
        await dependencies.workflow.markTimeoutPhase(offer.id, "completed");
      }
    } catch (error) {
      const message = errorMessage(error);
      await dependencies.workflow.recordTimeoutError(offer.id, message).catch((recordError) => {
        console.error("[visit-timeout] checkpoint error write failed", recordError);
      });
      console.error(`[visit-timeout] offer ${offer.id} recovery incomplete`, error);
    } finally {
      if (offer.lineUserId) {
        await dependencies.lock.release(offer.lineUserId, "visit").catch(() => {});
      }
    }
    handled++;
  }

  return handled;
}
