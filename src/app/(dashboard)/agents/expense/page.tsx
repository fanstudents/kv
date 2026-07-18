"use client";

import { useCallback, useState } from "react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextArea, Select, TextInput } from "@/components/ui/Field";

const agent = getAgent("expense")!;

const RECEIPT_TYPES = ["電子發票", "紙本發票", "收據"];

export default function ExpenseAgentPage() {
  const [receiptTypes, setReceiptTypes] = useState<string[]>(["電子發票", "紙本發票"]);
  const [archiveTarget, setArchiveTarget] = useState("sheet");
  const [approvalFlow, setApprovalFlow] = useState("manual");
  const [deadlineDay, setDeadlineDay] = useState("25");
  const [template, setTemplate] = useState(
    "提醒您，本月報帳截止日為 {{day}} 號，目前尚有 3 筆發票尚未上傳歸檔。"
  );

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (Array.isArray(s.receiptTypes)) setReceiptTypes(s.receiptTypes as string[]);
    if (typeof s.archiveTarget === "string") setArchiveTarget(s.archiveTarget);
    if (typeof s.approvalFlow === "string") setApprovalFlow(s.approvalFlow);
    if (typeof s.deadlineDay === "string") setDeadlineDay(s.deadlineDay);
    if (typeof s.template === "string") setTemplate(s.template);
  }, []);

  const toggleType = (t: string) => {
    setReceiptTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const previewText = template.replace("{{day}}", deadlineDay);

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.expense}
      onSettingsLoaded={onSettingsLoaded}
      previewText={previewText}
      settings={{ receiptTypes, archiveTarget, approvalFlow, deadlineDay, template }}
      settingsForm={
        <div className="space-y-4">
          <Field label="可辨識憑證類型">
            <div className="flex flex-wrap gap-3">
              {RECEIPT_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={receiptTypes.includes(t)}
                    onChange={() => toggleType(t)}
                    className="h-4 w-4 rounded border-neutral-300 text-[#06C755] focus:ring-[#06C755]"
                  />
                  {t}
                </label>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="歸檔至">
              <Select value={archiveTarget} onChange={(e) => setArchiveTarget(e.target.value)}>
                <option value="sheet">Google Sheet</option>
                <option value="notion">Notion</option>
                <option value="erp">公司 ERP</option>
              </Select>
            </Field>
            <Field label="審核流程">
              <Select value={approvalFlow} onChange={(e) => setApprovalFlow(e.target.value)}>
                <option value="manual">需人工審核</option>
                <option value="auto">自動核准</option>
              </Select>
            </Field>
            <Field label="每月截止日">
              <TextInput
                type="number"
                min={1}
                max={31}
                value={deadlineDay}
                onChange={(e) => setDeadlineDay(e.target.value)}
              />
            </Field>
          </div>

          <Field label="截止提醒範本" hint="可使用變數 {{day}}">
            <TextArea rows={3} value={template} onChange={(e) => setTemplate(e.target.value)} />
          </Field>
        </div>
      }
    />
  );
}
