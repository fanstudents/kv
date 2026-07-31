import { normalizeVisitLineInbound, type LineInboundEvent } from "./line-inbound";

export interface VisitLineWebhookDispatchHandlers {
  touchSubscriber: (userId: string) => Promise<void>;
  handleImageMessage: (event: LineInboundEvent, userId: string) => Promise<void>;
  handleTextMessage: (event: LineInboundEvent, userId: string, baseUrl: string) => Promise<void>;
  handlePostback: (event: LineInboundEvent, userId: string, baseUrl: string) => Promise<void>;
}

export interface VisitLineWebhookDispatchInput {
  events: LineInboundEvent[];
  baseUrl: string;
  fallbackUserId: string;
  handlers: VisitLineWebhookDispatchHandlers;
}

/**
 * Keeps webhook event fan-out and failure isolation outside the HTTP route.
 * Handler/provider/data behavior is injected unchanged for the strangler step.
 */
export async function dispatchVisitLineWebhookEvents({
  events,
  baseUrl,
  fallbackUserId,
  handlers,
}: VisitLineWebhookDispatchInput): Promise<void> {
  await Promise.allSettled(
    events.map(async (event) => {
      if (!event.replyToken) return;

      const userId = event.source?.userId ?? fallbackUserId;
      if (event.source?.userId) await handlers.touchSubscriber(event.source.userId).catch(() => {});

      const inbound = normalizeVisitLineInbound({
        ...event,
        source: { ...event.source, userId },
      });

      if (inbound.kind === "image") {
        await handlers.handleImageMessage(event, userId);
      } else if (inbound.kind === "text") {
        await handlers.handleTextMessage(event, userId, baseUrl);
      } else if (inbound.kind === "postback") {
        await handlers.handlePostback(event, userId, baseUrl);
      }
    })
  );
}
