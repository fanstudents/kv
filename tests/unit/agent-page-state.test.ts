import { describe, expect, it } from "vitest";
import {
  createAgentFailureActivity,
  mapAgentActivityRows,
  readAgentApiResponse,
} from "@/components/agents/agent-page-state";

describe("Agent page state contracts", () => {
  it("maps valid activity rows and keeps unknown statuses visible as pending", () => {
    expect(
      mapAgentActivityRows([
        {
          id: "a1",
          occurred_at: "2026-08-15T00:00:00.000Z",
          summary: "已完成",
          status: "success",
        },
        {
          occurred_at: "invalid",
          summary: 42,
          status: "unknown",
        },
      ])
    ).toEqual([
      {
        id: "a1",
        timestamp: new Date("2026-08-15T00:00:00.000Z").toLocaleString("zh-TW"),
        summary: "已完成",
        status: "success",
      },
      {
        id: "activity-1",
        timestamp: "時間未知",
        summary: "（沒有提供執行摘要）",
        status: "pending",
      },
    ]);
  });

  it("returns null for a malformed activity response instead of treating it as empty", () => {
    expect(mapAgentActivityRows({ data: [] })).toBeNull();
  });

  it("creates an explicit failed activity for a live read or write error", () => {
    expect(createAgentFailureActivity("error-1", "執行紀錄讀取失敗")).toMatchObject({
      id: "error-1",
      summary: "執行紀錄讀取失敗",
      status: "failed",
    });
  });

  it("preserves API error payloads and rejects non-OK responses", async () => {
    await expect(
      readAgentApiResponse(
        new Response(JSON.stringify({ error: "設定儲存失敗" }), { status: 400 }),
        "fallback"
      )
    ).rejects.toThrow("設定儲存失敗");

    await expect(
      readAgentApiResponse(new Response(JSON.stringify({ ok: true }), { status: 200 }), "fallback")
    ).resolves.toEqual({ ok: true });
  });
});
