import "server-only";

import type { getMainSupabase } from "@/lib/supabase";
import type { NormalizedOrder, OrdersRepository } from "@/modules/orders/orders";

type SupabaseOrdersClient = ReturnType<typeof getMainSupabase>;

export function createSupabaseOrdersRepository(supabase: SupabaseOrdersClient): OrdersRepository {
  return {
    async upsertOrder(order) {
      await supabase
        .from("teachify_orders")
        .upsert(toTeachifyOrderUpsert(order), { onConflict: "order_id" });
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
  };
}

function toTeachifyOrderUpsert(order: NormalizedOrder) {
  return {
    order_id: order.id,
    trade_no: order.tradeNo || null,
    amount: order.amount,
    currency: order.currency,
    user_name: order.userName,
    user_email: order.userEmail || null,
    item_names: order.itemNames,
    coupon_code: order.couponCode,
    is_refund: order.isRefund,
    paid_at: order.paidAt,
    source: "webhook" as const,
  };
}
