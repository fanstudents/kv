import "server-only";
import { getSupabase } from "./supabase";

export interface OrderRevenueSummary {
  totalOrders: number;
  totalRevenue: number;
  refundCount: number;
  refundAmount: number;
  topItems: { name: string; count: number; revenue: number }[];
}

/** 數據助理（Ivy）用：近 N 天 Teachify 訂單營收總覽（teachify_orders 裡 webhook 即時與回填資料都在同一張表）。 */
export async function getOrderRevenueSummary(days = 7): Promise<OrderRevenueSummary> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from("teachify_orders")
    .select("amount,is_refund,item_names,paid_at")
    .gte("paid_at", cutoff);

  const rows = (data ?? []) as { amount: number; is_refund: boolean; item_names: string[] }[];
  const paid = rows.filter((r) => !r.is_refund);
  const refunded = rows.filter((r) => r.is_refund);

  const itemMap = new Map<string, { count: number; revenue: number }>();
  paid.forEach((r) => {
    (r.item_names ?? []).forEach((name) => {
      const entry = itemMap.get(name) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += Number(r.amount) || 0;
      itemMap.set(name, entry);
    });
  });

  const topItems = [...itemMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([name, v]) => ({ name, count: v.count, revenue: v.revenue }));

  return {
    totalOrders: paid.length,
    totalRevenue: paid.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    refundCount: refunded.length,
    refundAmount: refunded.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    topItems,
  };
}
