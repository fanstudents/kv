"use client";

import { useCallback, useState } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextInput } from "@/components/ui/Field";

const agent = getAgent("teamlead")!;

export default function TeamLeadAgentPage() {
  const [reportTo, setReportTo] = useState("");
  const [reportTime, setReportTime] = useState("09:00");
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [reportMessage, setReportMessage] = useState("");

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (typeof s.reportTo === "string") setReportTo(s.reportTo);
    if (typeof s.reportTime === "string") setReportTime(s.reportTime);
  }, []);

  const handleReportNow = async () => {
    setReportState("sending");
    setReportMessage("");
    try {
      const res = await fetch("/api/agents/teamlead/report-now", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "匯報失敗");
      setReportState("sent");
      setReportMessage(data.message ?? "晨報已送出");
      setTimeout(() => setReportState("idle"), 4000);
    } catch (err) {
      setReportState("error");
      setReportMessage(err instanceof Error ? err.message : "匯報失敗");
    }
  };

  const previewText =
    "7月17日 星期五 晨報\n\n昨天團隊整體運作順暢，完成 12 件任務。\n• 可可（約拜訪 Agent）：辨識 3 張名片並寄出 2 封邀約信\n• 凱文（通知 Agent）：觸發 1 次指標警示\n需要留意：1 件邀約自動排程失敗，建議人工跟進。";

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.teamlead}
      onSettingsLoaded={onSettingsLoaded}
      previewText={previewText}
      previewTitle="立即匯報"
      testPushLabel="傳送晨報樣式測試"
      settings={{ reportTo, reportTime }}
      settingsForm={
        <div className="space-y-4">
          <Field label="匯報對象 LINE User ID" hint="每日晨報會推播給這個 LINE 帳號（U 開頭）">
            <TextInput value={reportTo} onChange={(e) => setReportTo(e.target.value)} placeholder="Uxxxxxxxx..." />
          </Field>
          <Field label="每日匯報時間" hint="實際觸發時間由排程器控制（預設 GitHub Actions 每天 09:00 台北時間）">
            <TextInput type="time" value={reportTime} onChange={(e) => setReportTime(e.target.value)} />
          </Field>
        </div>
      }
      preview={
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            點下方按鈕，薇薇安會立刻彙整過去 24 小時所有成員的工作紀錄，用 AI 寫成晨報推播到你的
            LINE——跟每天早上排程送出的內容完全相同。
          </p>
          <button
            type="button"
            onClick={handleReportNow}
            disabled={reportState === "sending"}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#475569] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {reportState === "sending" ? <Loader2 size={15} className="animate-spin" /> : <Megaphone size={15} />}
            {reportState === "sending" ? "彙整團隊動態中…" : "立即產生並送出晨報"}
          </button>
          {reportMessage && (
            <p className={`text-xs ${reportState === "error" ? "text-red-500" : "text-[#06C755]"}`}>{reportMessage}</p>
          )}
        </div>
      }
    />
  );
}
