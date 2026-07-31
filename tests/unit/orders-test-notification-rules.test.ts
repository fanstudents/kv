import { describe, expect, it } from "vitest";
import { planOrderTestNotification } from "@/modules/orders/test-notification-rules";

describe("planOrderTestNotification", () => {
  it("keeps the recipient validation and flex default", () => {
    expect(planOrderTestNotification({ settings: { reportTo: "  " } })).toEqual({
      kind: "missing-recipient",
      message: "尚未設定通知對象，請先在下方填入 LINE User ID 並儲存設定",
    });

    expect(planOrderTestNotification({ settings: { reportTo: " U123 " } })).toMatchObject({
      kind: "ready",
      delivery: {
        recipient: "U123",
        style: "flex",
        title: "新訂單通知（測試）",
        accentColor: "#F59E0B",
      },
    });
  });

  it("keeps supported push styles and the demo order text", () => {
    const result = planOrderTestNotification({ settings: { reportTo: "U123", pushStyle: "buttons" } });
    expect(result).toMatchObject({ kind: "ready", delivery: { style: "buttons", recipient: "U123" } });
    if (result.kind === "ready") {
      expect(result.delivery.text).toContain("黃晴");
      expect(result.delivery.text).toContain("DEN26071757D27ECED16");
    }
  });
});
