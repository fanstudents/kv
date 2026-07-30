import { describe, expect, it } from "vitest";
import type { NormalizedOrder } from "@/modules/orders/domain";
import { formatOrderText, planOrderNotification } from "@/modules/orders/notification";
import { toLegacyTeachifyOrderUpsert } from "@/modules/orders/legacy-schema";

const order: NormalizedOrder = {
  id: "order-1",
  tradeNo: "T-1",
  amount: 1680,
  currency: "TWD",
  userName: "Dennis",
  userEmail: "dennis@example.test",
  itemNames: ["產品化工作坊"],
  couponCode: "EARLY",
  isRefund: false,
  paidAt: "2026-07-31T01:00:00.000Z",
};

describe("Orders notification planning", () => {
  it("writes the exact existing teachify_orders row", () => {
    expect(toLegacyTeachifyOrderUpsert(order)).toEqual({
      order_id: "order-1",
      trade_no: "T-1",
      amount: 1680,
      currency: "TWD",
      user_name: "Dennis",
      user_email: "dennis@example.test",
      item_names: ["產品化工作坊"],
      coupon_code: "EARLY",
      is_refund: false,
      paid_at: "2026-07-31T01:00:00.000Z",
      source: "webhook",
    });
    expect(
      toLegacyTeachifyOrderUpsert({ ...order, tradeNo: "", userEmail: "" })
    ).toMatchObject({ trade_no: null, user_email: null });
  });

  it("preserves the existing paid order copy", () => {
    expect(formatOrderText(order)).toBe(
      "🎉 新訂單成立！\n\nDennis（dennis@example.test）\n品項：產品化工作坊\n金額：TWD 1680（優惠碼：EARLY）\n單號：T-1"
    );
  });

  it("preserves the enrollment fallback and refund copy", () => {
    expect(
      formatOrderText({
        ...order,
        tradeNo: "",
        amount: 0,
        couponCode: null,
        isRefund: true,
      })
    ).toBe(
      "💸 訂單退款\n\nDennis（dennis@example.test）\n品項：產品化工作坊\n（此通知來自選課紀錄，Teachify 未提供金額與單號明細）"
    );
  });

  it("skips delivery only when the legacy Agent row is explicitly disabled", () => {
    expect(planOrderNotification(order, { enabled: false })).toEqual({ type: "disabled" });
    expect(planOrderNotification(order, null).type).toBe("missing_recipient");
  });

  it("trims recipients and preserves style fallback and delivery metadata", () => {
    expect(
      planOrderNotification(order, {
        enabled: true,
        settings: { reportTo: "  U123  ", pushStyle: "buttons" },
      })
    ).toEqual({
      type: "deliver",
      recipient: "U123",
      style: "buttons",
      text: formatOrderText(order),
      title: "新訂單通知",
      accentColor: "#F59E0B",
      successSummary: "新訂單通知已送出：Dennis / 產品化工作坊 / TWD 1680",
    });
    expect(
      planOrderNotification(order, {
        settings: { reportTo: "U123", pushStyle: "unsupported" },
      })
    ).toMatchObject({ type: "deliver", style: "flex" });
  });

  it("preserves the missing-recipient activity summary", () => {
    expect(planOrderNotification(order, { settings: { reportTo: " " } })).toEqual({
      type: "missing_recipient",
      activitySummary: "收到新訂單（T-1）但尚未設定通知對象，請到訂單 Agent 設定頁補上",
    });
  });
});
