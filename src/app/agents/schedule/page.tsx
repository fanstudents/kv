"use client";

import { useCallback, useState } from "react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextInput, TextArea, Select } from "@/components/ui/Field";
import Toggle from "@/components/ui/Toggle";

const agent = getAgent("schedule")!;

export default function ScheduleAgentPage() {
  const [calendarSource, setCalendarSource] = useState("google");
  const [slots, setSlots] = useState("週一至週五 10:00–18:00，每次諮詢 30 分鐘");
  const [reminderMinutes, setReminderMinutes] = useState("30");
  const [allowReschedule, setAllowReschedule] = useState(true);
  const [template, setTemplate] = useState(
    "您好，已為您確認 7/18（六）14:00 的諮詢預約，會議前 {{minutes}} 分鐘會再提醒您。"
  );

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (typeof s.calendarSource === "string") setCalendarSource(s.calendarSource);
    if (typeof s.slots === "string") setSlots(s.slots);
    if (typeof s.reminderMinutes === "string") setReminderMinutes(s.reminderMinutes);
    if (typeof s.allowReschedule === "boolean") setAllowReschedule(s.allowReschedule);
    if (typeof s.template === "string") setTemplate(s.template);
  }, []);

  const previewText = template.replace("{{minutes}}", reminderMinutes);

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.schedule}
      onSettingsLoaded={onSettingsLoaded}
      previewText={previewText}
      settings={{ calendarSource, slots, reminderMinutes, allowReschedule, template }}
      settingsForm={
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="串接行事曆">
              <Select value={calendarSource} onChange={(e) => setCalendarSource(e.target.value)}>
                <option value="google">Google Calendar</option>
                <option value="outlook">Outlook 行事曆</option>
                <option value="none">尚未串接</option>
              </Select>
            </Field>
            <Field label="會議前提醒（分鐘）">
              <TextInput
                type="number"
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(e.target.value)}
              />
            </Field>
          </div>

          <Field label="可預約時段" hint="用於自動比對客戶要求的時間是否可預約">
            <TextArea rows={2} value={slots} onChange={(e) => setSlots(e.target.value)} />
          </Field>

          <Field label="確認訊息範本" hint="可使用變數 {{minutes}}">
            <TextArea rows={3} value={template} onChange={(e) => setTemplate(e.target.value)} />
          </Field>

          <Toggle
            checked={allowReschedule}
            onChange={setAllowReschedule}
            label="允許客戶透過 LINE 自行改期 / 取消"
          />
        </div>
      }
    />
  );
}
