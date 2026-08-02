import "server-only";

import type { getMainSupabase } from "@/lib/supabase";
import type { NormalizedOrder, OrdersRepository } from "@/modules/orders/orders";

type SupabaseOrdersClient = ReturnType<typeof getMainSupabase>;
type OrdersDatabaseError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
};

export class OrdersRepositoryError extends Error {
  constructor(
    readonly operation: "upsert order" | "read Agent config",
    databaseError: OrdersDatabaseError
  ) {
    super(`Orders repository could not ${operation}: ${databaseError.message}`, { cause: databaseError });
    this.name = "OrdersRepositoryError";
  }
}

export function createSupabaseOrdersRepository(supabase: SupabaseOrdersClient): OrdersRepository {
  return {
    async upsertOrder(order) {
      const { error } = await supabase
        .from("teachify_orders")
        .upsert(toTeachifyOrderUpsert(order), { onConflict: "order_id" });
      if (error) throw new OrdersRepositoryError("upsert order", error);
    },
    async getAgentConfig() {
      const { data, error } = await supabase
        .from("line_agents")
        .select("enabled, settings")
        .eq("slug", "orders")
        .maybeSingle();
      if (error) throw new OrdersRepositoryError("read Agent config", error);
      return data;
    },
    async recordActivity(activity) {
      const { error } = await supabase.from("line_agent_activity").insert({
        agent_slug: "orders",
        summary: activity.summary,
        status: activity.status,
      });
      if (error) console.error("[orders] could not record activity", error);
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
