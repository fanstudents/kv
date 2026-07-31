import "server-only";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages } from "@/lib/line-message-styles";
import { getSupabase } from "@/lib/supabase";
import type { OrdersTestNotificationPort } from "@/modules/orders/test-notification-ports";

export function createLegacyOrdersTestNotificationAdapter(): OrdersTestNotificationPort {
  const supabase = getSupabase();

  return {
    async getAgentConfig() {
      const { data } = await supabase
        .from("line_agents")
        .select("settings")
        .eq("slug", "orders")
        .single();
      return data;
    },
    async send(delivery) {
      await pushLineRawMessages(
        delivery.recipient,
        buildPushMessages({
          style: delivery.style,
          text: delivery.text,
          title: delivery.title,
          accentColor: delivery.accentColor,
        }),
      );
    },
    async recordActivity(activity) {
      await supabase.from("line_agent_activity").insert({
        agent_slug: "orders",
        summary: activity.summary,
        status: activity.status,
      });
    },
  };
}
