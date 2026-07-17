"use client";

import { useCallback, useState } from "react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextArea, Select } from "@/components/ui/Field";
import Toggle from "@/components/ui/Toggle";

const agent = getAgent("card")!;

const FIELDS = ["姓名", "公司", "職稱", "電話", "Email"];

export default function CardAgentPage() {
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [autoContact, setAutoContact] = useState(true);
  const [delayHours, setDelayHours] = useState("2");
  const [syncTarget, setSyncTarget] = useState("hubspot");
  const [template, setTemplate] = useState(
    "{{name}} 您好，很高興今天在活動上與您交流，附上我們的簡介資料，有任何問題歡迎隨時詢問！"
  );

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (typeof s.ocrEnabled === "boolean") setOcrEnabled(s.ocrEnabled);
    if (typeof s.autoContact === "boolean") setAutoContact(s.autoContact);
    if (typeof s.delayHours === "string") setDelayHours(s.delayHours);
    if (typeof s.syncTarget === "string") setSyncTarget(s.syncTarget);
    if (typeof s.template === "string") setTemplate(s.template);
  }, []);

  const previewText = template.replace("{{name}}", "陳經理");

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.card}
      onSettingsLoaded={onSettingsLoaded}
      previewText={previewText}
      settings={{ ocrEnabled, autoContact, delayHours, syncTarget, template }}
      settingsForm={
        <div className="space-y-4">
          <Toggle checked={ocrEnabled} onChange={setOcrEnabled} label="啟用名片 OCR 掃描辨識" />
          <Toggle checked={autoContact} onChange={setAutoContact} label="自動建立聯絡人" />

          <Field label="辨識欄位">
            <div className="flex flex-wrap gap-2">
              {FIELDS.map((f) => (
                <span
                  key={f}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {f}
                </span>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="會後信延遲寄出（小時）">
              <input
                type="number"
                value={delayHours}
                onChange={(e) => setDelayHours(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/20 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </Field>
            <Field label="同步至">
              <Select value={syncTarget} onChange={(e) => setSyncTarget(e.target.value)}>
                <option value="hubspot">HubSpot</option>
                <option value="notion">Notion</option>
                <option value="sheet">Google Sheet</option>
                <option value="none">不同步</option>
              </Select>
            </Field>
          </div>

          <Field label="會後跟進信範本" hint="可使用變數 {{name}}">
            <TextArea rows={3} value={template} onChange={(e) => setTemplate(e.target.value)} />
          </Field>
        </div>
      }
    />
  );
}
