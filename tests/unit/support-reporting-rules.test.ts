import { describe, expect, it } from "vitest";
import {
  finalizeSupportReport,
  planSupportReportDelivery,
  prepareSupportReport,
  supportCustomerIds,
  supportReportCutoff,
  type SupportConversation,
} from "@/modules/support/daily-report";

const now = new Date("2026-07-31T01:00:00.000Z");

function message(userId: string, text: string): SupportConversation {
  return {
    line_user_id: userId,
    text,
    occurred_at: "2026-07-31T00:00:00.000Z",
  };
}

describe("Amber Support daily reporting rules", () => {
  it("preserves disabled and missing-recipient outcomes", () => {
    expect(planSupportReportDelivery({ enabled: false })).toEqual({
      type: "disabled",
      message: "客服 Agent 已停用，略過匯報",
    });
    expect(planSupportReportDelivery({ settings: {} })).toEqual({
      type: "missing_recipient",
      message: "尚未設定匯報對象（reportTo）",
    });
  });

  it("trims recipients and preserves style and Support delivery metadata", () => {
    expect(
      planSupportReportDelivery({
        settings: { reportTo: " U123 ", pushStyle: "buttons" },
      })
    ).toEqual({
      type: "deliver",
      recipient: "U123",
      style: "buttons",
      title: "客服 Agent・每日彙報",
      accentColor: "#EC4899",
    });
    expect(
      planSupportReportDelivery({
        settings: { reportTo: "U123", pushStyle: "other" },
      })
    ).toMatchObject({ type: "deliver", style: "flex" });
  });

  it("uses the exact rolling 24-hour cutoff", () => {
    expect(supportReportCutoff(now.getTime())).toBe("2026-07-30T01:00:00.000Z");
  });

  it("keeps unique customer IDs in first-message order", () => {
    expect(
      supportCustomerIds([
        message("U2", "first"),
        message("U1", "second"),
        message("U2", "third"),
      ])
    ).toEqual(["U2", "U1"]);
  });

  it("preserves grouping, names, counts, and raw brief copy", () => {
    const messages = [
      message("U222222222222", "第一題"),
      message("U111111111111", "另一題"),
      message("U222222222222", "追問"),
    ];
    const prepared = prepareSupportReport(
      messages,
      new Map([["U222222222222", "王小明"]]),
      now
    );

    expect(prepared.customerCount).toBe(2);
    expect(prepared.messageCount).toBe(3);
    expect(prepared.rawBrief).toBe(
      "統計：2 位客戶、共 3 則留言\n\n王小明（2 則）：\n- 第一題\n- 追問\n\n未命名客戶（U111111111…）（1 則）：\n- 另一題"
    );
  });

  it("keeps eight messages per customer and slices each message at 120", () => {
    const longText = "字".repeat(125);
    const messages = Array.from({ length: 9 }, (_, index) =>
      message("U123", index === 0 ? longText : `留言 ${index + 1}`)
    );
    const prepared = prepareSupportReport(messages, new Map(), now);

    expect(prepared.rawBrief).toContain(`- ${"字".repeat(120)}`);
    expect(prepared.rawBrief).not.toContain("留言 9");
    expect(prepared.messageCount).toBe(9);
  });

  it("preserves empty-day copy and ignores an AI summary", () => {
    const prepared = prepareSupportReport([], new Map(), now);

    expect(prepared).toMatchObject({
      customerCount: 0,
      messageCount: 0,
      rawBrief: null,
    });
    expect(prepared.fallbackText).toBe(
      `${prepared.dateLabel} 客服彙報\n\n過去 24 小時客服官方帳號沒有收到新的客戶留言。`
    );
    expect(finalizeSupportReport(prepared, "不應採用")).toBe(prepared.fallbackText);
  });

  it("uses AI copy when present and raw copy when unavailable", () => {
    const prepared = prepareSupportReport(
      [message("U123", "詢問進度")],
      new Map(),
      now
    );

    expect(finalizeSupportReport(prepared, "AI 摘要")).toBe(
      `${prepared.dateLabel} 客服彙報\n\nAI 摘要`
    );
    expect(finalizeSupportReport(prepared, null)).toBe(prepared.fallbackText);
  });
});
