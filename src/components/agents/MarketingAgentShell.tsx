"use client";

import { useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import type { AgentSlug } from "@/lib/types";

// 行銷 Team 五個 Agent 共用的設定殼：尚未串接資料源，先提供整合說明與推播範本。
export default function MarketingAgentShell({
  slug,
  integration,
  previewText,
  reportLabel = "推播範本",
  topPanel,
}: {
  slug: AgentSlug;
  integration: string;
  previewText: string;
  reportLabel?: string;
  /** 頭像／身分列之後、任務流程節點之前的專屬內容(例如真實數據圖表) */
  topPanel?: React.ReactNode;
}) {
  const agent = getAgent(slug)!;
  const [dataSource, setDataSource] = useState("");
  const [template, setTemplate] = useState(previewText);

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (typeof s.dataSource === "string") setDataSource(s.dataSource);
    if (typeof s.template === "string") setTemplate(s.template);
  }, []);

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS[slug]}
      onSettingsLoaded={onSettingsLoaded}
      previewText={template}
      settings={{ dataSource, template }}
      topPanel={topPanel}
      settingsForm={
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              這位是「行銷 Team」的成員，核心邏輯已就緒，還需要{integration}才會開始實際運作。串接完成後，成效與提醒就會出現在上方執行紀錄。
            </p>
          </div>

          <Field label="資料來源／帳號" hint="填入之後要串接的平台帳號或識別碼（例如廣告帳號 ID、網站網域）">
            <TextInput value={dataSource} onChange={(e) => setDataSource(e.target.value)} placeholder="尚未設定" />
          </Field>

          <Field label={reportLabel} hint="這位 Agent 定期推播到 LINE 的訊息範本">
            <TextArea rows={4} value={template} onChange={(e) => setTemplate(e.target.value)} />
          </Field>
        </div>
      }
    />
  );
}
