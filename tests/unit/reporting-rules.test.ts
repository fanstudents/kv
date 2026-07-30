import { describe, expect, it } from "vitest";
import {
  finalizeTeamLeadReport,
  planTeamLeadDelivery,
  prepareTeamLeadReport,
  teamLeadActivityCutoff,
  type ReportingActivity,
} from "@/modules/reporting/daily-report";

const now = new Date("2026-07-31T01:00:00.000Z");

function row(
  agentSlug: string | null,
  summary: string,
  status: ReportingActivity["status"] = "success"
): ReportingActivity {
  return {
    agent_slug: agentSlug,
    occurred_at: "2026-07-31T00:00:00.000Z",
    summary,
    status,
  };
}

describe("Vivian daily reporting rules", () => {
  it("preserves disabled and missing-recipient outcomes", () => {
    expect(planTeamLeadDelivery({ enabled: false })).toEqual({
      type: "disabled",
      message: "總管 Agent 已停用，略過匯報",
    });
    expect(planTeamLeadDelivery({ settings: { reportTo: " " } })).toEqual({
      type: "missing_recipient",
      message: "尚未設定匯報對象（reportTo）",
    });
  });

  it("trims the recipient and preserves style and LINE metadata", () => {
    expect(
      planTeamLeadDelivery({
        enabled: true,
        settings: { reportTo: " U123 ", pushStyle: "buttons" },
      })
    ).toEqual({
      type: "deliver",
      recipient: "U123",
      style: "buttons",
      title: "總管 Agent・每日晨報",
      accentColor: "#475569",
    });
    expect(
      planTeamLeadDelivery({ settings: { reportTo: "U123", pushStyle: "unsupported" } })
    ).toMatchObject({ type: "deliver", style: "flex" });
  });

  it("uses the exact rolling 24-hour cutoff", () => {
    expect(teamLeadActivityCutoff(now.getTime())).toBe("2026-07-30T01:00:00.000Z");
  });

  it("preserves filtering, group order, counts, and raw brief copy", () => {
    const rows = [
      row("visit", "完成拜訪"),
      row(null, "沒有 owner"),
      row("orders", "草稿狀態：待確認"),
      row("visit", "寄送失敗", "failed"),
      row("orders", "訂單完成", "pending"),
    ];

    const prepared = prepareTeamLeadReport(rows, now, (slug) => `Agent ${slug}`);

    expect(prepared.meaningful).toEqual([rows[0], rows[3], rows[4]]);
    expect(prepared.rawBrief).toBe(
      "統計：完成 1 件、失敗 1 件、共 3 筆動作\n\nAgent visit：\n- [success] 完成拜訪\n- [failed] 寄送失敗\n\nAgent orders：\n- [pending] 訂單完成"
    );
    expect(prepared.fallbackText).toBe(
      `${prepared.dateLabel} 晨報\n\n${prepared.rawBrief}`
    );
  });

  it("keeps only the first six rows per Agent", () => {
    const rows = Array.from({ length: 8 }, (_, index) => row("visit", `動作 ${index + 1}`));
    const prepared = prepareTeamLeadReport(rows, now, (slug) => slug);

    expect(prepared.rawBrief).toContain("- [success] 動作 6");
    expect(prepared.rawBrief).not.toContain("- [success] 動作 7");
    expect(prepared.meaningful).toHaveLength(8);
  });

  it("preserves empty-day copy and never substitutes an AI summary", () => {
    const prepared = prepareTeamLeadReport([], now, (slug) => slug);

    expect(prepared.rawBrief).toBeNull();
    expect(prepared.fallbackText).toBe(
      `${prepared.dateLabel} 晨報\n\n過去 24 小時團隊沒有新的執行紀錄，各位成員待命中。有新任務進來我會隨時盯著，請老闆放心。`
    );
    expect(finalizeTeamLeadReport(prepared, "不應採用")).toBe(prepared.fallbackText);
  });

  it("uses AI copy when present and raw copy when unavailable", () => {
    const prepared = prepareTeamLeadReport([row("visit", "完成拜訪")], now, (slug) => slug);

    expect(finalizeTeamLeadReport(prepared, "AI 摘要")).toBe(
      `${prepared.dateLabel} 晨報\n\nAI 摘要`
    );
    expect(finalizeTeamLeadReport(prepared, null)).toBe(prepared.fallbackText);
  });
});
