"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Loader2, Megaphone } from "lucide-react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextArea, TextInput } from "@/components/ui/Field";

const agent = getAgent("support")!;

export default function SupportAgentPage() {
  const [autoReplyText, setAutoReplyText] = useState(
    "已收到您的訊息，我們的客服人員會盡快回覆您，謝謝您的耐心等候！"
  );
  const [reportTo, setReportTo] = useState("");
  const [reportTime, setReportTime] = useState("09:00");
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [reportMessage, setReportMessage] = useState("");

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (typeof s.autoReplyText === "string") setAutoReplyText(s.autoReplyText);
    if (typeof s.reportTo === "string") setReportTo(s.reportTo);
    if (typeof s.reportTime === "string") setReportTime(s.reportTime);
  }, []);

  const handleReportNow = async () => {
    setReportState("sending");
    setReportMessage("");
    try {
      const res = await fetch("/api/agents/support/report-now", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "匯報失敗");
      setReportState("sent");
      setReportMessage(data.message ?? "客服彙報已送出");
      setTimeout(() => setReportState("idle"), 4000);
    } catch (err) {
      setReportState("error");
      setReportMessage(err instanceof Error ? err.message : "匯報失敗");
    }
  };

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.support}
      onSettingsLoaded={onSettingsLoaded}
      previewText={autoReplyText}
      previewTitle="立即彙報"
      testPushLabel="傳送自動回覆樣式測試"
      settings={{ autoReplyText, reportTo, reportTime }}
      settingsForm={
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">還需要接上第二支 LINE 官方帳號才會真正啟用</p>
              <p className="mt-1 leading-relaxed">
                1. 到 LINE Developers Console 建立（或選擇）要當客服用的 Messaging API Channel
                <br />
                2. 把該 Channel 的 Webhook URL 設成：<code className="rounded bg-black/10 px-1">https://kva.zeabur.app/api/line/webhook/support</code>
                <br />
                3. 把該 Channel 的 <strong>Channel Secret</strong> 與 <strong>Channel Access Token</strong> 分別設定成
                Zeabur 環境變數 <code className="rounded bg-black/10 px-1">LINE_SUPPORT_CHANNEL_SECRET</code> 與{" "}
                <code className="rounded bg-black/10 px-1">LINE_SUPPORT_CHANNEL_ACCESS_TOKEN</code>
                <br />
                4. 重新部署後，客戶傳訊息到這支客服帳號就會自動回覆並記錄在下方執行紀錄
              </p>
            </div>
          </div>

          <Field label="自動回覆內容" hint="客戶傳訊息進來時，會立即收到這則回覆">
            <TextArea rows={3} value={autoReplyText} onChange={(e) => setAutoReplyText(e.target.value)} />
          </Field>
          <Field label="每日彙報對象 LINE User ID" hint="每天早上會把過去 24 小時所有客戶留言彙整推播給這個 LINE 帳號（U 開頭）">
            <TextInput value={reportTo} onChange={(e) => setReportTo(e.target.value)} placeholder="Uxxxxxxxx..." />
          </Field>
          <Field label="每日彙報時間" hint="實際觸發時間由排程器控制（預設 GitHub Actions 每天 09:00 台北時間）">
            <TextInput type="time" value={reportTime} onChange={(e) => setReportTime(e.target.value)} />
          </Field>
        </div>
      }
      preview={
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            點下方按鈕，安柏會立刻彙整過去 24 小時客服官方帳號收到的所有客戶留言，用 AI
            寫成彙報推播到你的 LINE——跟每天早上排程送出的內容完全相同。
          </p>
          <button
            type="button"
            onClick={handleReportNow}
            disabled={reportState === "sending"}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#EC4899] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {reportState === "sending" ? <Loader2 size={15} className="animate-spin" /> : <Megaphone size={15} />}
            {reportState === "sending" ? "彙整客戶留言中…" : "立即產生並送出彙報"}
          </button>
          {reportMessage && (
            <p className={`text-xs ${reportState === "error" ? "text-red-500" : "text-[#06C755]"}`}>{reportMessage}</p>
          )}
        </div>
      }
    />
  );
}
