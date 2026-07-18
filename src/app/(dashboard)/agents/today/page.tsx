"use client";

import { useCallback, useState } from "react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextInput, TextArea } from "@/components/ui/Field";
import Toggle from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";

const agent = getAgent("today")!;

// Sample rows only — real data will come from Gmail + LINE once those
// integrations are connected (needs Google OAuth + the LINE OA's message log).
const SAMPLE_TODOS = [
  { source: "Gmail · sales@tbr.digital", customer: "王經理", task: "確認教育訓練提案書", created: "2026-07-14", status: "needs-reminder" as const },
  { source: "數位簡報室 LINE", customer: "陳小姐", task: "回覆下週課程時間", created: "2026-07-15", status: "pending" as const },
  { source: "Gmail · service@tbr.digital", customer: "林副理", task: "簽署合作備忘錄", created: "2026-07-13", status: "done" as const },
  { source: "數位簡報室 LINE", customer: "Kevin（客戶）", task: "確認一對一陪跑時段", created: "2026-07-14", status: "needs-reminder" as const },
];

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  done: { label: "已完成", tone: "success" },
  pending: { label: "待確認", tone: "warning" },
  "needs-reminder": { label: "需提醒", tone: "danger" },
};

export default function TodayAgentPage() {
  const [gmailAccount1, setGmailAccount1] = useState("sales@tbr.digital");
  const [gmailAccount2, setGmailAccount2] = useState("service@tbr.digital");
  const [lineOaName, setLineOaName] = useState("數位簡報室");
  const [lookbackDays, setLookbackDays] = useState("2");
  const [autoReminder, setAutoReminder] = useState(true);
  const [reminderTemplate, setReminderTemplate] = useState(
    "提醒您：{{customer}} 的「{{task}}」已 {{days}} 天沒有回應，要不要再跟進一下？"
  );

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (typeof s.gmailAccount1 === "string") setGmailAccount1(s.gmailAccount1);
    if (typeof s.gmailAccount2 === "string") setGmailAccount2(s.gmailAccount2);
    if (typeof s.lineOaName === "string") setLineOaName(s.lineOaName);
    if (typeof s.lookbackDays === "string") setLookbackDays(s.lookbackDays);
    if (typeof s.autoReminder === "boolean") setAutoReminder(s.autoReminder);
    if (typeof s.reminderTemplate === "string") setReminderTemplate(s.reminderTemplate);
  }, []);

  const needsReminder = SAMPLE_TODOS.filter((t) => t.status === "needs-reminder");
  const first = needsReminder[0];
  const previewText = first
    ? reminderTemplate
        .replace("{{customer}}", first.customer)
        .replace("{{task}}", first.task)
        .replace("{{days}}", lookbackDays)
    : "目前沒有需要提醒的待辦事項。";

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.today}
      onSettingsLoaded={onSettingsLoaded}
      previewText={previewText}
      previewTitle="待辦清單 + 提醒預覽"
      testPushLabel="傳送逾期提醒測試"
      settings={{ gmailAccount1, gmailAccount2, lineOaName, lookbackDays, autoReminder, reminderTemplate }}
      settingsForm={
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Gmail 信箱 1">
              <TextInput value={gmailAccount1} onChange={(e) => setGmailAccount1(e.target.value)} />
            </Field>
            <Field label="Gmail 信箱 2">
              <TextInput value={gmailAccount2} onChange={(e) => setGmailAccount2(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="LINE 官方帳號名稱">
              <TextInput value={lineOaName} onChange={(e) => setLineOaName(e.target.value)} />
            </Field>
            <Field label="回顧天數" hint="彙整最近幾天內的客戶往來訊息">
              <TextInput type="number" min={1} value={lookbackDays} onChange={(e) => setLookbackDays(e.target.value)} />
            </Field>
          </div>

          <Toggle
            checked={autoReminder}
            onChange={setAutoReminder}
            label="偵測到超過回顧天數仍無回應時，自動發送 LINE 提醒"
          />

          <Field label="提醒訊息範本" hint="可使用變數 {{customer}}、{{task}}、{{days}}">
            <TextArea rows={3} value={reminderTemplate} onChange={(e) => setReminderTemplate(e.target.value)} />
          </Field>
        </div>
      }
      preview={
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-xs">
              <thead className="bg-neutral-50 text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                <tr>
                  <th className="px-2.5 py-2 text-left font-medium">客戶 / 待辦</th>
                  <th className="px-2.5 py-2 text-left font-medium">來源</th>
                  <th className="px-2.5 py-2 text-left font-medium">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {SAMPLE_TODOS.map((t, i) => (
                  <tr key={i}>
                    <td className="px-2.5 py-2">
                      <p className="font-medium text-neutral-800 dark:text-neutral-100">{t.customer}</p>
                      <p className="text-neutral-400">{t.task}</p>
                    </td>
                    <td className="px-2.5 py-2 text-neutral-500 dark:text-neutral-400">{t.source}</td>
                    <td className="px-2.5 py-2">
                      <Badge tone={STATUS_LABEL[t.status].tone}>{STATUS_LABEL[t.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] leading-snug text-neutral-400">
            以上為示範資料。實際串接需要 Gmail API（Google OAuth）與讀取「{lineOaName}」的訊息紀錄，目前尚未接上。
          </p>
        </div>
      }
    />
  );
}
