import "server-only";

import type { getMainSupabase } from "@/lib/supabase";
import { OrdersRepositoryError } from "@/adapters/orders/supabase-orders-repository";
import type { OrderDeliveryLedger } from "@/modules/orders/orders";

type SupabaseOrdersClient = ReturnType<typeof getMainSupabase>;

type ClaimRow = {
  claim_status: string;
  delivery_id: string;
  delivery_status: string;
};

export function createSupabaseOrderDeliveryLedger(supabase: SupabaseOrdersClient): OrderDeliveryLedger {
  return {
    async claim({ orderId, eventKey, recipient }) {
      const { data, error } = await supabase.rpc("claim_teachify_order_delivery", {
        p_order_id: orderId,
        p_event_key: eventKey,
        p_recipient: recipient,
        p_stale_after_seconds: 300,
      });
      if (error) throw new OrdersRepositoryError("claim order delivery", error);

      const row = (Array.isArray(data) ? data[0] : data) as ClaimRow | undefined;
      if (!row?.delivery_id) {
        throw new OrdersRepositoryError("claim order delivery", { message: "delivery claim returned no row" });
      }

      if (row.claim_status === "delivery_complete") {
        return { status: "delivery_complete", deliveryId: row.delivery_id };
      }
      if (row.claim_status === "in_progress") {
        return { status: "in_progress", deliveryId: row.delivery_id };
      }
      if (row.claim_status === "claimed") {
        return { status: "claimed", deliveryId: row.delivery_id };
      }
      throw new OrdersRepositoryError("claim order delivery", {
        message: `unknown delivery claim status: ${row.claim_status}`,
      });
    },

    async markDelivered(deliveryId) {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("teachify_order_deliveries")
        .update({ delivery_status: "delivered", delivered_at: now, updated_at: now })
        .eq("id", deliveryId);
      if (error) throw new OrdersRepositoryError("update order delivery", error);
    },

    async markFailed(deliveryId, message) {
      const { error } = await supabase
        .from("teachify_order_deliveries")
        .update({
          delivery_status: "failed",
          last_error: message.slice(0, 2000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", deliveryId);
      if (error) throw new OrdersRepositoryError("update order delivery", error);
    },
  };
}
