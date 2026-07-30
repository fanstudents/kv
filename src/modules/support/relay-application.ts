import {
  planSupportRelayCapture,
  type SupportRelayLineEvent,
} from "@/modules/support/relay-inbound";
import type { SupportRelayPorts } from "@/modules/support/relay-ports";

export async function processSupportRelay(params: {
  rawBody: string;
  signature: string;
  contentType: string;
  events: SupportRelayLineEvent[];
  ports: SupportRelayPorts;
}): Promise<void> {
  const { rawBody, signature, contentType, events, ports } = params;

  await Promise.allSettled([
    ports.relay
      .forward({ rawBody, signature, contentType })
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : "轉發失敗";
        await ports.repository.recordActivity({
          summary: `轉發給舊客服系統失敗：${message}（客戶仍會由舊系統處理，只是這筆沒轉發成功）`,
          status: "failed",
        });
      }),
    ...events.map(async (event) => {
      const capture = planSupportRelayCapture(event);
      if (capture.type === "skip") return;

      if (capture.sourceUserId) {
        await ports.subscribers.touch(capture.sourceUserId).catch(() => {});
      }

      await Promise.allSettled([
        ports.repository.recordActivity({
          summary: capture.activitySummary,
          status: "success",
        }),
        ports.conversations.recordCustomerMessage(
          capture.userId,
          capture.text
        ),
      ]);
    }),
  ]);
}
