import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  createLineOrdersDelivery,
  createSupabaseOrderDeliveryLedger,
  createSupabaseOrdersRepository,
  getMainSupabase,
  verifyTeachifyWebhook,
} = vi.hoisted(() => ({
  createLineOrdersDelivery: vi.fn(),
  createSupabaseOrderDeliveryLedger: vi.fn(),
  createSupabaseOrdersRepository: vi.fn(),
  getMainSupabase: vi.fn(),
  verifyTeachifyWebhook: vi.fn(),
}));

vi.mock("@/adapters/orders/line-orders-delivery", () => ({ createLineOrdersDelivery }));
vi.mock("@/adapters/orders/supabase-order-delivery-ledger", () => ({ createSupabaseOrderDeliveryLedger }));
vi.mock("@/adapters/orders/supabase-orders-repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/orders/supabase-orders-repository")>()),
  createSupabaseOrdersRepository,
}));
vi.mock("@/lib/supabase", () => ({ getMainSupabase }));
vi.mock("@/lib/teachify-webhook-server", () => ({ verifyTeachifyWebhook }));

import { POST as postTestNotification } from "@/app/api/agents/orders/test-notify/route";
import { POST as postTeachifyOrder } from "@/app/api/webhooks/teachify-order/route";
import { OrdersRepositoryError } from "@/adapters/orders/supabase-orders-repository";

beforeEach(() => {
  vi.clearAllMocks();
  getMainSupabase.mockReturnValue({});
  createLineOrdersDelivery.mockReturnValue({ deliver: vi.fn(async () => undefined) });
  createSupabaseOrderDeliveryLedger.mockReturnValue({
    claim: vi.fn(async () => ({ status: "claimed", deliveryId: "delivery-1" })),
    markDelivered: vi.fn(async () => undefined),
    markFailed: vi.fn(async () => undefined),
  });
  createSupabaseOrdersRepository.mockReturnValue({
    upsertOrder: vi.fn(async () => undefined),
    getAgentConfig: vi.fn(async () => ({ settings: { reportTo: "U123" } })),
    recordActivity: vi.fn(async () => undefined),
  });
});

describe("Orders route contracts", () => {
  it("keeps invalid Teachify signature and payload responses", async () => {
    const repository = {
      recordActivity: vi.fn(async () => undefined),
    };
    createSupabaseOrdersRepository.mockReturnValue(repository);
    verifyTeachifyWebhook.mockReturnValue("invalid");

    const invalidSignature = await postTeachifyOrder(
      new NextRequest("http://localhost/api/webhooks/teachify-order", { method: "POST", body: "{}" })
    );
    expect(invalidSignature.status).toBe(401);
    await expect(invalidSignature.json()).resolves.toEqual({ error: "invalid signature" });
    expect(repository.recordActivity).toHaveBeenCalledWith({
      summary: "Teachify 訂單 Webhook 簽章驗證失敗，已拒絕",
      status: "failed",
    });

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    repository.recordActivity.mockRejectedValueOnce(
      new OrdersRepositoryError("record activity", { message: "audit unavailable" })
    );
    const invalidSignatureWithoutAudit = await postTeachifyOrder(
      new NextRequest("http://localhost/api/webhooks/teachify-order", { method: "POST", body: "{}" })
    );
    expect(invalidSignatureWithoutAudit.status).toBe(401);
    await expect(invalidSignatureWithoutAudit.json()).resolves.toEqual({ error: "invalid signature" });
    expect(consoleError).toHaveBeenCalledWith(
      "[orders] could not audit rejected Teachify webhook",
      expect.any(OrdersRepositoryError)
    );
    consoleError.mockRestore();

    verifyTeachifyWebhook.mockReturnValue("unverified");
    const invalidPayload = await postTeachifyOrder(
      new NextRequest("http://localhost/api/webhooks/teachify-order", { method: "POST", body: "not-json" })
    );
    expect(invalidPayload.status).toBe(400);
    await expect(invalidPayload.json()).resolves.toEqual({ error: "invalid payload" });
  });

  it("returns an explicit retry-safe error after delivery succeeds but audit persistence fails", async () => {
    const delivery = { deliver: vi.fn(async () => undefined) };
    createLineOrdersDelivery.mockReturnValue(delivery);
    verifyTeachifyWebhook.mockReturnValue("unverified");
    createSupabaseOrdersRepository.mockReturnValueOnce({
      upsertOrder: vi.fn(async () => undefined),
      getAgentConfig: vi.fn(async () => ({ settings: { reportTo: "U123" } })),
      recordActivity: vi.fn(async () => {
        throw new OrdersRepositoryError("record activity", { message: "audit unavailable" });
      }),
    });

    const response = await postTeachifyOrder(
      new NextRequest("http://localhost/api/webhooks/teachify-order", {
        method: "POST",
        body: JSON.stringify({ id: "order-audit-failure", items: [] }),
      })
    );

    expect(delivery.deliver).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "訂單通知已送出，但執行紀錄寫入失敗，請勿重複發送",
    });
  });

  it("acknowledges duplicate and in-progress delivery claims without another LINE send", async () => {
    verifyTeachifyWebhook.mockReturnValue("unverified");
    const delivery = { deliver: vi.fn(async () => undefined) };
    createLineOrdersDelivery.mockReturnValue(delivery);

    createSupabaseOrderDeliveryLedger.mockReturnValueOnce({
      claim: vi.fn(async () => ({ status: "delivery_complete", deliveryId: "delivery-1" })),
      markDelivered: vi.fn(async () => undefined),
      markFailed: vi.fn(async () => undefined),
    });
    const duplicate = await postTeachifyOrder(
      new NextRequest("http://localhost/api/webhooks/teachify-order", {
        method: "POST",
        body: JSON.stringify({ id: "order-duplicate", items: [] }),
      })
    );
    expect(duplicate.status).toBe(200);
    await expect(duplicate.json()).resolves.toEqual({ ok: true, note: "duplicate order event skipped" });

    createSupabaseOrderDeliveryLedger.mockReturnValueOnce({
      claim: vi.fn(async () => ({ status: "in_progress", deliveryId: "delivery-2" })),
      markDelivered: vi.fn(async () => undefined),
      markFailed: vi.fn(async () => undefined),
    });
    const inProgress = await postTeachifyOrder(
      new NextRequest("http://localhost/api/webhooks/teachify-order", {
        method: "POST",
        body: JSON.stringify({ id: "order-in-progress", items: [] }),
      })
    );
    expect(inProgress.status).toBe(202);
    await expect(inProgress.json()).resolves.toEqual({ ok: true, note: "order delivery already in progress" });
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it("keeps test-notification missing-recipient and success responses", async () => {
    createSupabaseOrdersRepository.mockReturnValueOnce({
      getAgentConfig: vi.fn(async () => ({ settings: { reportTo: " " } })),
    });
    const missingRecipient = await postTestNotification();
    expect(missingRecipient.status).toBe(400);
    await expect(missingRecipient.json()).resolves.toEqual({
      error: "尚未設定通知對象，請先在下方填入 LINE User ID 並儲存設定",
    });

    const repository = {
      getAgentConfig: vi.fn(async () => ({ settings: { reportTo: "U123" } })),
      recordActivity: vi.fn(async () => undefined),
    };
    createSupabaseOrdersRepository.mockReturnValueOnce(repository);
    const success = await postTestNotification();
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ ok: true, message: "測試通知已送出，請查看 LINE" });
    expect(repository.recordActivity).toHaveBeenCalledWith({
      summary: "已送出測試訂單通知",
      status: "success",
    });
  });

  it("returns 503 and stops delivery when the Orders data boundary fails", async () => {
    const delivery = { deliver: vi.fn(async () => undefined) };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    createLineOrdersDelivery.mockReturnValue(delivery);
    verifyTeachifyWebhook.mockReturnValue("unverified");
    createSupabaseOrdersRepository.mockReturnValueOnce({
      upsertOrder: vi.fn(async () => {
        throw new OrdersRepositoryError("upsert order", { message: "database unavailable" });
      }),
      getAgentConfig: vi.fn(),
      recordActivity: vi.fn(async () => undefined),
    });

    const webhookResponse = await postTeachifyOrder(
      new NextRequest("http://localhost/api/webhooks/teachify-order", {
        method: "POST",
        body: JSON.stringify({ id: "order-503", items: [] }),
      })
    );
    expect(webhookResponse.status).toBe(503);
    await expect(webhookResponse.json()).resolves.toEqual({ error: "orders data unavailable" });
    expect(delivery.deliver).not.toHaveBeenCalled();

    createSupabaseOrdersRepository.mockReturnValueOnce({
      getAgentConfig: vi.fn(async () => {
        throw new OrdersRepositoryError("read Agent config", { message: "database unavailable" });
      }),
    });
    const testNotificationResponse = await postTestNotification();
    expect(testNotificationResponse.status).toBe(503);
    await expect(testNotificationResponse.json()).resolves.toEqual({ error: "orders data unavailable" });
    expect(delivery.deliver).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(2);

    consoleError.mockRestore();
  });
});
