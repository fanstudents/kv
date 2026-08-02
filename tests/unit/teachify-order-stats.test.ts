import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase } = vi.hoisted(() => ({ getMainSupabase: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { getOrderRevenueSummary } from "@/lib/teachify-order-stats";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe("Teachify order revenue summary", () => {
  it("keeps the paid/refund split, item aggregation, and paid-at cutoff", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T05:00:00.000Z"));
    const gte = vi.fn().mockResolvedValue({
      data: [
        { amount: 100, is_refund: false, item_names: ["Course", "Bundle"] },
        { amount: 50, is_refund: false, item_names: ["Course"] },
        { amount: 20, is_refund: true, item_names: ["Course"] },
      ],
    });
    const select = vi.fn(() => ({ gte }));
    const from = vi.fn(() => ({ select }));
    getMainSupabase.mockReturnValue({ from });

    await expect(getOrderRevenueSummary(7)).resolves.toEqual({
      totalOrders: 2,
      totalRevenue: 150,
      refundCount: 1,
      refundAmount: 20,
      topItems: [
        { name: "Course", count: 2, revenue: 150 },
        { name: "Bundle", count: 1, revenue: 100 },
      ],
    });
    expect(from).toHaveBeenCalledWith("teachify_orders");
    expect(select).toHaveBeenCalledWith("amount,is_refund,item_names,paid_at");
    expect(gte).toHaveBeenCalledWith("paid_at", "2026-07-26T05:00:00.000Z");
  });
});
