import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages } from "@/lib/line-message-styles";
import type { getSupabase } from "@/lib/supabase";
import { toLegacyTeachifyOrderUpsert } from "@/modules/orders/legacy-schema";
import type { OrdersPorts } from "@/modules/orders/ports";

type LegacySupabaseClient = ReturnType<typeof getSupabase>;

export function createLegacyOrdersAdapters(supabase: LegacySupabaseClient): OrdersPorts {
  return {
    repository: {
      async upsertOrder(order) {
        await supabase
          .from("teachify_orders")
          .upsert(toLegacyTeachifyOrderUpsert(order), { onConflict: "order_id" });
      },
      async getAgentConfig() {
        const { data } = await supabase
          .from("line_agents")
          .select("enabled, settings")
          .eq("slug", "orders")
          .single();
        return data;
      },
      async recordActivity(activity) {
        await supabase.from("line_agent_activity").insert({
          agent_slug: "orders",
          summary: activity.summary,
          status: activity.status,
        });
      },
    },
    delivery: {
      async deliver(notification) {
        await pushLineRawMessages(
          notification.recipient,
          buildPushMessages(notification)
        );
      },
    },
  };
}
