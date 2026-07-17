"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextInput } from "@/components/ui/Field";
import { formatOrderText, type NormalizedOrder } from "@/lib/teachify-orders";

const agent = getAgent("orders")!;

const DEMO_ORDER: NormalizedOrder = {
  id: "demo",
  tradeNo: "DEN26071757D27ECED16",
  amount: 2180,
  currency: "TWD",
  userName: "黃晴",
  userEmail: "sonia8265@gmail.com",
  itemNames: ["Claude 實戰工作坊課程 - 7/19(日) 13:00~17:00 台中席次"],
  couponCode: null,
  isRefund: false,
  paidAt: null,
};

export default function OrdersAgentPage() {
  const [reportTo, setReportTo] = useState("");
  const [testState, setTestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (typeof s.reportTo === "string") setReportTo(s.reportTo);
  }, []);

  const handleTestNotify = async () => {
    setTestState("sending");
    setTestMessage("");
    try {
      const res = await fetch("/api/agents/orders/test-notify", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "測試通知失敗");
      setTestState("sent");
      setTestMessage(data.message ?? "測試通知已送出");
      setTimeout(() => setTestState("idle"), 4000);
    } catch (err) {
      setTestState("error");
      setTestMessage(err instanceof Error ? err.message : "測試通知失敗");
    }
  };

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.orders}
      onSettingsLoaded={onSettingsLoaded}
      previewText={formatOrderText(DEMO_ORDER)}
      previewTitle="訂單通知測試"
      settings={{ reportTo }}
      settingsForm={
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">還需要在 Teachify 後台設定 Webhook 才會真正即時通知</p>
              <p className="mt-1 leading-relaxed">
                把 Teachify 網站的訂單 Webhook 網址設成：
                <br />
                <code className="rounded bg-black/10 px-1">https://kva.zeabur.app/api/webhooks/teachify-order</code>
                <br />
                若 Teachify 有提供簽章密鑰，設定成 Zeabur 環境變數{" "}
                <code className="rounded bg-black/10 px-1">TEACHIFY_WEBHOOK_SECRET</code>
                （沒設定的話仍會照常運作，只是不驗證來源）。設定完成後，下方「立即產生並送出晨報」旁的測試按鈕可以先確認
                LINE 通知樣式是否正常。
              </p>
            </div>
          </div>

          <Field label="通知對象 LINE User ID" hint="新訂單或退款會即時推播給這個 LINE 帳號（U 開頭）">
            <TextInput value={reportTo} onChange={(e) => setReportTo(e.target.value)} placeholder="Uxxxxxxxx..." />
          </Field>
        </div>
      }
      preview={
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            用一筆示範訂單（欄位結構取自真實 Teachify 訂單）測試通知樣式，跟真的 Webhook 觸發時收到的內容一模一樣。
          </p>
          <button
            type="button"
            onClick={handleTestNotify}
            disabled={testState === "sending"}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {testState === "sending" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {testState === "sending" ? "送出中…" : "傳送測試訂單通知"}
          </button>
          {testMessage && (
            <p className={`text-xs ${testState === "error" ? "text-red-500" : "text-[#06C755]"}`}>{testMessage}</p>
          )}
        </div>
      }
    />
  );
}
