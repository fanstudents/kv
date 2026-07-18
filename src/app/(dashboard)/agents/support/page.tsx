"use client";

import { useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextArea } from "@/components/ui/Field";

const agent = getAgent("support")!;

export default function SupportAgentPage() {
  const [autoReplyText, setAutoReplyText] = useState(
    "已收到您的訊息，我們的客服人員會盡快回覆您，謝謝您的耐心等候！"
  );

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (typeof s.autoReplyText === "string") setAutoReplyText(s.autoReplyText);
  }, []);

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.support}
      onSettingsLoaded={onSettingsLoaded}
      previewText={autoReplyText}
      settings={{ autoReplyText }}
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
        </div>
      }
    />
  );
}
