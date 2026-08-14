import { describe, expect, it, vi } from "vitest";

import { createSupabaseOrderDeliveryLedger } from "@/adapters/orders/supabase-order-delivery-ledger";

describe("Supabase order delivery ledger", () => {
  it("maps claimed, complete, and in-progress database claims", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ claim_status: "claimed", delivery_id: "delivery-1", delivery_status: "sending" }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ claim_status: "delivery_complete", delivery_id: "delivery-1", delivery_status: "delivered" }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ claim_status: "in_progress", delivery_id: "delivery-2", delivery_status: "sending" }],
        error: null,
      });
    const ledger = createSupabaseOrderDeliveryLedger({ rpc } as never);

    await expect(ledger.claim({ orderId: "order-1", eventKey: "event-1", recipient: "U123" })).resolves.toEqual({
      status: "claimed",
      deliveryId: "delivery-1",
    });
    await expect(ledger.claim({ orderId: "order-1", eventKey: "event-1", recipient: "U123" })).resolves.toEqual({
      status: "delivery_complete",
      deliveryId: "delivery-1",
    });
    await expect(ledger.claim({ orderId: "order-2", eventKey: "event-2", recipient: "U123" })).resolves.toEqual({
      status: "in_progress",
      deliveryId: "delivery-2",
    });
    expect(rpc).toHaveBeenNthCalledWith(1, "claim_teachify_order_delivery", {
      p_order_id: "order-1",
      p_event_key: "event-1",
      p_recipient: "U123",
      p_stale_after_seconds: 300,
    });
  });

  it("fails closed when the claim RPC returns an error or no row", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "database unavailable" } })
      .mockResolvedValueOnce({ data: [], error: null });
    const ledger = createSupabaseOrderDeliveryLedger({ rpc } as never);

    await expect(ledger.claim({ orderId: "order-1", eventKey: "event-1", recipient: "U123" })).rejects.toMatchObject({
      name: "OrdersRepositoryError",
      message: expect.stringContaining("database unavailable"),
    });
    await expect(ledger.claim({ orderId: "order-1", eventKey: "event-1", recipient: "U123" })).rejects.toMatchObject({
      name: "OrdersRepositoryError",
      message: expect.stringContaining("no row"),
    });
  });

  it("records delivered and failed outcomes on the same delivery row", async () => {
    const update = vi.fn();
    const eq = vi.fn().mockResolvedValue({ error: null });
    update.mockReturnValue({ eq });
    const ledger = createSupabaseOrderDeliveryLedger({ from: vi.fn(() => ({ update })) } as never);

    await ledger.markDelivered("delivery-1");
    await ledger.markFailed("delivery-1", "LINE unavailable");

    expect(update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ delivery_status: "delivered", updated_at: expect.any(String) })
    );
    expect(update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ delivery_status: "failed", last_error: "LINE unavailable" })
    );
    expect(eq).toHaveBeenNthCalledWith(1, "id", "delivery-1");
    expect(eq).toHaveBeenNthCalledWith(2, "id", "delivery-1");
  });
});
