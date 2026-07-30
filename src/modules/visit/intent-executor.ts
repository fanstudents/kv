import type { VisitIntent, VisitState } from "@/modules/visit/domain";

export type VisitIntentType = VisitIntent["type"];
export type VisitIntentOf<T extends VisitIntentType> = Extract<VisitIntent, { type: T }>;

export interface VisitIntentContext {
  state: VisitState;
  eventId: string;
  runId?: string;
}

export type VisitIntentHandlers = {
  [T in VisitIntentType]: (
    intent: VisitIntentOf<T>,
    context: VisitIntentContext
  ) => Promise<void>;
};

export type VisitIntentExecutionMode = "record-only" | "execute";

export interface VisitIntentReceipt {
  type: VisitIntentType;
  outcome: "recorded" | "executed";
  idempotencyKey?: string;
}

export class VisitIntentExecutionError extends Error {
  constructor(
    public readonly intent: VisitIntent,
    public readonly completed: VisitIntentReceipt[],
    options: { cause: unknown }
  ) {
    super(`Visit intent ${intent.type} failed`, options);
  }
}

function idempotencyKey(intent: VisitIntent): string | undefined {
  return "idempotencyKey" in intent ? intent.idempotencyKey : undefined;
}

/**
 * Executes intents in reducer order, or records the exact same plan in shadow
 * mode. Shadow mode cannot reach a handler and therefore cannot create side
 * effects accidentally.
 */
export async function executeVisitIntents(
  intents: readonly VisitIntent[],
  context: VisitIntentContext,
  options:
    | { mode: "record-only" }
    | { mode: "execute"; handlers: VisitIntentHandlers }
): Promise<VisitIntentReceipt[]> {
  const receipts: VisitIntentReceipt[] = [];

  for (const intent of intents) {
    if (options.mode === "record-only") {
      receipts.push({
        type: intent.type,
        outcome: "recorded",
        idempotencyKey: idempotencyKey(intent),
      });
      continue;
    }

    try {
      const handler = options.handlers[intent.type] as (
        intent: VisitIntent,
        context: VisitIntentContext
      ) => Promise<void>;
      await handler(intent, context);
      receipts.push({
        type: intent.type,
        outcome: "executed",
        idempotencyKey: idempotencyKey(intent),
      });
    } catch (cause) {
      throw new VisitIntentExecutionError(intent, receipts, { cause });
    }
  }

  return receipts;
}
