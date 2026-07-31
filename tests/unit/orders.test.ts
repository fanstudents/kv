import { describe, expect, it } from "vitest";
import {
  DEMO_ORDER,
  formatOrderText,
  parseOrderPayload,
  planOrderNotification,
  planOrderTestNotification,
  processOrderPayload,
  runOrderTestNotification,
  type NormalizedOrder,
  type OrdersActivity,
  type OrdersAgentConfig,
  type OrdersDependencies,
} from "@/modules/orders/orders";

const payload = {
  id: "order-1",
  trade_no: "T-1",
  amount: 1680,
  currency: "TWD",
  user_name: "Dennis",
  user_email: "dennis@example.test",
  items: [{ name: "產品化工作坊" }],
};

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

function fakeDependencies(params?: {
  config?: OrdersAgentConfig | null;
  deliveryError?: unknown;
}) {
  const calls: string[] = [];
  const activities: OrdersActivity[] = [];
  const dependencies: OrdersDependencies = {
    repository: {
      async upsertOrder(normalizedOrder) {
        calls.push(`upsert:${normalizedOrder.id}`);
      },
      async getAgentConfig() {
        calls.push("config");
        return params?.config ?? { enabled: true, settings: { reportTo: "U123" } };
      },
      async recordActivity(activity) {
        calls.push(`activity:${activity.status}`);
        activities.push(activity);
      },
    },
    delivery: {
      async deliver(delivery) {
        calls.push(`deliver:${delivery.recipient}`);
        if (params && "deliveryError" in params) throw params.deliveryError;
      },
    },
  };
  return { dependencies, calls, activities };
}

describe("Orders request and notification rules", () => {
  it("normalizes a direct Teachify order without changing coercion or defaults", () => {
    expect(
      parseOrderPayload({
        id: 42,
        trade_no: "T-42",
        amount: "1680",
        currency: "TWD",
        user_name: "Dennis",
        user_email: "dennis@example.test",
        items: [{ name: "產品化工作坊" }, { name: 123 }, {}],
        coupon_code: "EARLY",
        status: "refunded",
        paid_at: "2026-07-31T01:00:00.000Z",
      })
    ).toEqual({
      id: "42",
      tradeNo: "T-42",
      amount: 1680,
      currency: "TWD",
      userName: "Dennis",
      userEmail: "dennis@example.test",
      itemNames: ["產品化工作坊"],
      couponCode: "EARLY",
      isRefund: true,
      paidAt: "2026-07-31T01:00:00.000Z",
    });
  });

  it.each(["order", "data"] as const)("accepts the existing %s envelope", (key) => {
    expect(
      parseOrderPayload({
        [key]: {
          id: "order-1",
          tradeNo: "T-1",
          items: [],
        },
      })
    ).toEqual({
      id: "order-1",
      tradeNo: "T-1",
      amount: 0,
      currency: "TWD",
      userName: "（未提供姓名）",
      userEmail: "",
      itemNames: ["（未提供品項名稱）"],
      couponCode: null,
      isRefund: false,
      paidAt: null,
    });
  });

  it("normalizes only the known course enrollment fallback", () => {
    expect(
      parseOrderPayload({
        type: "course.student_enroll",
        data: {
          id: "enrolment-1",
          created_at: "2026-07-31T02:00:00.000Z",
          course: { name: "AI 工程課" },
          user: { name: "Dennis", email: "dennis@example.test" },
        },
      })
    ).toEqual({
      id: "enrolment-1",
      tradeNo: "",
      amount: 0,
      currency: "TWD",
      userName: "Dennis",
      userEmail: "dennis@example.test",
      itemNames: ["AI 工程課"],
      couponCode: null,
      isRefund: false,
      paidAt: "2026-07-31T02:00:00.000Z",
    });
    expect(parseOrderPayload({ type: "course.updated", data: {} })).toBeNull();
  });

  it.each([
    null,
    "payload",
    {},
    { id: "not-order-like" },
    { type: "course.student_enroll", data: { course: {}, user: {} } },
  ])("rejects an unrecognized payload", (unknownPayload) => {
    expect(parseOrderPayload(unknownPayload)).toBeNull();
  });

  it("preserves paid, enrollment fallback, and refund copy", () => {
    expect(formatOrderText(order)).toBe(
      "🎉 新訂單成立！\n\nDennis（dennis@example.test）\n品項：產品化工作坊\n金額：TWD 1680（優惠碼：EARLY）\n單號：T-1"
    );
    expect(
      formatOrderText({ ...order, tradeNo: "", amount: 0, couponCode: null, isRefund: true })
    ).toBe(
      "💸 訂單退款\n\nDennis（dennis@example.test）\n品項：產品化工作坊\n（此通知來自選課紀錄，Teachify 未提供金額與單號明細）"
    );
  });

  it("preserves disabled, recipient, and delivery planning", () => {
    expect(planOrderNotification(order, { enabled: false })).toEqual({ type: "disabled" });
    expect(planOrderNotification(order, null).type).toBe("missing_recipient");
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
      planOrderNotification(order, { settings: { reportTo: "U123", pushStyle: "unsupported" } })
    ).toMatchObject({ type: "deliver", style: "flex" });
    expect(planOrderNotification(order, { settings: { reportTo: " " } })).toEqual({
      type: "missing_recipient",
      activitySummary: "收到新訂單（T-1）但尚未設定通知對象，請到訂單 Agent 設定頁補上",
    });
  });
});

describe("Orders webhook orchestration", () => {
  it("records unrecognized payloads without persistence or delivery", async () => {
    const { dependencies, calls, activities } = fakeDependencies();
    const rawBody = `{"unknown":"${"x".repeat(600)}"}`;

    await expect(processOrderPayload({ payload: {}, rawBody, dependencies })).resolves.toEqual({
      type: "unrecognized",
    });
    expect(calls).toEqual(["activity:failed"]);
    expect(activities[0].summary).toBe(
      `收到 Teachify Webhook 但無法解析訂單欄位，原始內容：${rawBody.slice(0, 500)}`
    );
  });

  it("persists before checking an explicitly disabled Agent", async () => {
    const { dependencies, calls } = fakeDependencies({ config: { enabled: false } });

    await expect(
      processOrderPayload({ payload, rawBody: JSON.stringify(payload), dependencies })
    ).resolves.toEqual({ type: "disabled" });
    expect(calls).toEqual(["upsert:order-1", "config"]);
  });

  it("records a missing recipient after persistence and config lookup", async () => {
    const { dependencies, calls, activities } = fakeDependencies({
      config: { enabled: true, settings: { reportTo: " " } },
    });

    await expect(
      processOrderPayload({ payload, rawBody: JSON.stringify(payload), dependencies })
    ).resolves.toEqual({ type: "missing_recipient" });
    expect(calls).toEqual(["upsert:order-1", "config", "activity:failed"]);
    expect(activities[0].summary).toContain("尚未設定通知對象");
  });

  it("delivers and records success in the existing order", async () => {
    const { dependencies, calls, activities } = fakeDependencies();

    await expect(
      processOrderPayload({ payload, rawBody: JSON.stringify(payload), dependencies })
    ).resolves.toEqual({ type: "delivered" });
    expect(calls).toEqual(["upsert:order-1", "config", "deliver:U123", "activity:success"]);
    expect(activities[0].summary).toBe(
      "新訂單通知已送出：Dennis / 產品化工作坊 / TWD 1680"
    );
  });

  it("converts only delivery errors to the existing failed outcome", async () => {
    const { dependencies, calls, activities } = fakeDependencies({
      deliveryError: new Error("LINE unavailable"),
    });

    await expect(
      processOrderPayload({ payload, rawBody: JSON.stringify(payload), dependencies })
    ).resolves.toEqual({ type: "delivery_failed", message: "LINE unavailable" });
    expect(calls).toEqual(["upsert:order-1", "config", "deliver:U123", "activity:failed"]);
    expect(activities[0].summary).toBe("訂單通知推播失敗：LINE unavailable");
  });
});

describe("Orders test notification", () => {
  it("keeps the recipient validation, style fallback, and shared demo order", () => {
    expect(planOrderTestNotification({ settings: { reportTo: "  " } })).toEqual({
      kind: "missing-recipient",
      message: "尚未設定通知對象，請先在下方填入 LINE User ID 並儲存設定",
    });

    const result = planOrderTestNotification({
      settings: { reportTo: " U123 ", pushStyle: "buttons" },
    });
    expect(result).toMatchObject({
      kind: "ready",
      delivery: {
        recipient: "U123",
        style: "buttons",
        title: "新訂單通知（測試）",
        accentColor: "#F59E0B",
      },
    });
    if (result.kind === "ready") {
      expect(result.delivery.text).toContain(DEMO_ORDER.userName);
      expect(result.delivery.text).toContain(DEMO_ORDER.tradeNo);
    }
  });

  it("returns the existing missing-recipient response without delivery", async () => {
    const { dependencies, calls } = fakeDependencies({ config: { settings: { reportTo: " " } } });
    await expect(runOrderTestNotification(dependencies)).resolves.toEqual({
      kind: "missing-recipient",
      message: "尚未設定通知對象，請先在下方填入 LINE User ID 並儲存設定",
    });
    expect(calls).toEqual(["config"]);
  });

  it("delivers success and records delivery failure with the existing vocabulary", async () => {
    const success = fakeDependencies({ config: { settings: { reportTo: "U123", pushStyle: "text" } } });
    await expect(runOrderTestNotification(success.dependencies)).resolves.toEqual({
      kind: "success",
      message: "測試通知已送出，請查看 LINE",
    });
    expect(success.calls).toEqual(["config", "deliver:U123", "activity:success"]);

    const failure = fakeDependencies({
      config: { settings: { reportTo: "U123" } },
      deliveryError: new Error("LINE unavailable"),
    });
    await expect(runOrderTestNotification(failure.dependencies)).resolves.toEqual({
      kind: "error",
      message: "LINE unavailable",
    });
    expect(failure.calls).toEqual(["config", "deliver:U123", "activity:failed"]);
    expect(failure.activities[0].summary).toBe("測試訂單通知失敗：LINE unavailable");
  });
});
