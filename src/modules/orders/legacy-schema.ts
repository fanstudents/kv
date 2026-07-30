import type { NormalizedOrder } from "@/modules/orders/domain";

export function toLegacyTeachifyOrderUpsert(order: NormalizedOrder) {
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
