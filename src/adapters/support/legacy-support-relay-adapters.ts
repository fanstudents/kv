import { logConversationMessage } from "@/lib/support-conversations";
import type { getSupabase } from "@/lib/supabase";
import { supabaseSubscribersRepository } from "@/adapters/subscribers/supabase-subscribers-repository";
import type { SupportRelayPorts } from "@/modules/support/relay-ports";

type LegacySupabaseClient = ReturnType<typeof getSupabase>;

export function createLegacySupportRelayAdapters(
  supabase: LegacySupabaseClient
): SupportRelayPorts {
  return {
    relay: {
      async forward(request) {
        const targetUrl = process.env.SUPPORT_RELAY_TARGET_URL;
        if (!targetUrl) {
          throw new Error("Missing SUPPORT_RELAY_TARGET_URL environment variable");
        }

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": request.contentType,
            "X-Line-Signature": request.signature,
          },
          body: request.rawBody,
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(`舊系統回應 ${response.status}`);
      },
    },
    repository: {
      async recordActivity(activity) {
        await supabase.from("line_agent_activity").insert({
          agent_slug: "support",
          summary: activity.summary,
          status: activity.status,
        });
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
