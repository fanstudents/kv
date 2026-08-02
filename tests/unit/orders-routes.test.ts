import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  createLineOrdersDelivery,
  createSupabaseOrdersRepository,
  getMainSupabase,
  verifyTeachifyWebhook,
} = vi.hoisted(() => ({
  createLineOrdersDelivery: vi.fn(),
  createSupabaseOrdersRepository: vi.fn(),
  getMainSupabase: vi.fn(),
  verifyTeachifyWebhook: vi.fn(),
}));

vi.mock("@/adapters/orders/line-orders-delivery", () => ({ createLineOrdersDelivery }));
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

    verifyTeachifyWebhook.mockReturnValue("unverified");
    const invalidPayload = await postTeachifyOrder(
      new NextRequest("http://localhost/api/webhooks/teachify-order", { method: "POST", body: "not-json" })
    );
    expect(invalidPayload.status).toBe(400);
    await expect(invalidPayload.json()).resolves.toEqual({ error: "invalid payload" });
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
