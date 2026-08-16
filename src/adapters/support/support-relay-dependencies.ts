import { logConversationMessage } from "@/lib/support-conversations";
import type { getMainSupabase } from "@/lib/supabase";
import { supabaseSubscribersRepository } from "@/adapters/subscribers/supabase-subscribers-repository";
import {
  deriveSupportRelayDeliveryKey,
  SupportRelayForwardError,
  type SupportRelayPorts,
} from "@/modules/support/relay";

type SupportSupabaseClient = ReturnType<typeof getMainSupabase>;

export function createSupportRelayDependencies(
  supabase: SupportSupabaseClient
): SupportRelayPorts {
  return {
    relay: {
      async forward(request) {
        const targetUrl = process.env.SUPPORT_RELAY_TARGET_URL;
        if (!targetUrl) {
          throw new SupportRelayForwardError(
            "Missing SUPPORT_RELAY_TARGET_URL environment variable",
            "configuration"
          );
        }

        const deliveryKey = request.deliveryKey ?? deriveSupportRelayDeliveryKey(request.rawBody);
        let response: Response;
        try {
          response = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": request.contentType,
              "X-Line-Signature": request.signature,
              "X-KV-Support-Relay-Key": deliveryKey,
            },
            body: request.rawBody,
            signal: AbortSignal.timeout(8000),
          });
        } catch (error) {
          const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
          throw new SupportRelayForwardError(
            isTimeout ? "下游客服／助理系統轉送逾時" : error instanceof Error ? error.message : "下游客服／助理系統轉送網路錯誤",
            isTimeout ? "timeout" : "network",
            { cause: error }
          );
        }
        if (!response.ok) {
          throw new SupportRelayForwardError(`下游客服／助理系統回應 ${response.status}`, "rejected");
        }
      },
    },
    repository: {
      async recordActivity(activity) {
        const { error } = await supabase.from("line_agent_activity").insert({
          agent_slug: "support",
          summary: activity.summary,
          status: activity.status,
        });
        if (error) throw new Error(`Support relay activity write failed: ${error.message}`);
      },
    },
    subscribers: {
      async touch(lineUserId) {
        await supabaseSubscribersRepository.touch(lineUserId, "support");
      },
    },
    conversations: {
      async recordCustomerMessage(lineUserId, text) {
        await logConversationMessage(lineUserId, "customer", text);
      },
    },
  };
}
