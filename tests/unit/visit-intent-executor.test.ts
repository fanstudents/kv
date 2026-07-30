import { describe, expect, it, vi } from "vitest";
import {
  executeVisitIntents,
  VisitIntentExecutionError,
  type VisitIntentHandlers,
} from "@/modules/visit/intent-executor";
import type { VisitIntent } from "@/modules/visit/domain";

function handlers(
  implementation: (intent: VisitIntent) => Promise<void>
): VisitIntentHandlers {
  return new Proxy(
    {},
    {
      get: () => implementation,
    }
  ) as VisitIntentHandlers;
}

const context = {
  state: { status: "delivering_invite", inviteId: "invite-1" } as const,
  eventId: "event-1",
  runId: "run-1",
};

describe("Visit intent executor", () => {
  it("records a shadow plan without obtaining or calling a handler", async () => {
    const intents = [
      { type: "contact.persist", contact: { name: "Dennis" } },
      { type: "invite.deliver", idempotencyKey: "visit:invite-1:deliver" },
    ] satisfies VisitIntent[];

    await expect(
      executeVisitIntents(intents, context, { mode: "record-only" })
    ).resolves.toEqual([
      { type: "contact.persist", outcome: "recorded", idempotencyKey: undefined },
      {
        type: "invite.deliver",
        outcome: "recorded",
        idempotencyKey: "visit:invite-1:deliver",
      },
    ]);
  });

  it("executes handlers sequentially and preserves stable delivery keys", async () => {
    const observed: string[] = [];
    const intents = [
      { type: "invite.persist", inviteId: "invite-1", status: "pending" },
      { type: "invite.deliver", idempotencyKey: "visit:invite-1:deliver" },
    ] satisfies VisitIntent[];

    const receipts = await executeVisitIntents(intents, context, {
      mode: "execute",
      handlers: handlers(async (intent) => {
        observed.push(intent.type);
      }),
    });

    expect(observed).toEqual(["invite.persist", "invite.deliver"]);
    expect(receipts.at(-1)).toEqual({
      type: "invite.deliver",
      outcome: "executed",
      idempotencyKey: "visit:invite-1:deliver",
    });
  });

  it("stops on failure and exposes completed receipts for reconciliation", async () => {
    const implementation = vi.fn(async (intent: VisitIntent) => {
      if (intent.type === "invite.deliver") throw new Error("gmail timeout");
    });
    const intents = [
      { type: "invite.persist", inviteId: "invite-1", status: "pending" },
      { type: "invite.deliver", idempotencyKey: "visit:invite-1:deliver" },
      { type: "conversation.release" },
    ] satisfies VisitIntent[];

    try {
      await executeVisitIntents(intents, context, {
        mode: "execute",
        handlers: handlers(implementation),
      });
      expect.unreachable("expected intent execution to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(VisitIntentExecutionError);
      expect(error).toMatchObject({
        intent: { type: "invite.deliver" },
        completed: [{ type: "invite.persist", outcome: "executed" }],
      });
    }
    expect(implementation).toHaveBeenCalledTimes(2);
  });
});
