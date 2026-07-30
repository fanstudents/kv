import { describe, expect, it } from "vitest";
import { parseOrderPayload } from "@/modules/orders/inbound";

describe("Orders inbound normalization", () => {
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
  ])("rejects an unrecognized payload", (payload) => {
    expect(parseOrderPayload(payload)).toBeNull();
  });
});
