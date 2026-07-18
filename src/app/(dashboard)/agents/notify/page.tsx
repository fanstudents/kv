"use client";

import { useCallback, useState } from "react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextInput, TextArea, Select } from "@/components/ui/Field";

const agent = getAgent("notify")!;

export default function NotifyAgentPage() {
  const [triggerType, setTriggerType] = useState("threshold");
  const [metric, setMetric] = useState("問卷完成率");
  const [operator, setOperator] = useState("<");
  const [value, setValue] = useState("65");
  const [target, setTarget] = useState("行銷群組");
  const [template, setTemplate] = useState(
    "{{metric}} 目前為 {{value}}，已低於設定門檻，建議儘快確認並採取行動。"
  );
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (typeof s.triggerType === "string") setTriggerType(s.triggerType);
    if (typeof s.metric === "string") setMetric(s.metric);
    if (typeof s.operator === "string") setOperator(s.operator);
    if (typeof s.value === "string") setValue(s.value);
    if (typeof s.target === "string") setTarget(s.target);
    if (typeof s.template === "string") setTemplate(s.template);
    if (typeof s.quietStart === "string") setQuietStart(s.quietStart);
    if (typeof s.quietEnd === "string") setQuietEnd(s.quietEnd);
  }, []);

  const previewText = template.replace("{{metric}}", metric).replace("{{value}}", `${value}%`);

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.notify}
      onSettingsLoaded={onSettingsLoaded}
      previewText={previewText}
      settings={{ triggerType, metric, operator, value, target, template, quietStart, quietEnd }}
      settingsForm={
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="觸發類型">
              <Select value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
                <option value="threshold">數值門檻</option>
                <option value="event">事件觸發（如訂單、表單提交）</option>
                <option value="scheduled">定時提醒</option>
              </Select>
            </Field>
            <Field label="通知對象">
              <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="行銷群組">行銷群組</option>
                <option value="全體管理員">全體管理員</option>
                <option value="承辦人個人">承辦人個人</option>
              </Select>
            </Field>
          </div>

          {triggerType === "threshold" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="監控指標">
                <TextInput value={metric} onChange={(e) => setMetric(e.target.value)} />
              </Field>
              <Field label="條件">
                <Select value={operator} onChange={(e) => setOperator(e.target.value)}>
                  <option value="<">小於</option>
                  <option value=">">大於</option>
                  <option value="=">等於</option>
                </Select>
              </Field>
              <Field label="門檻值 (%)">
                <TextInput value={value} onChange={(e) => setValue(e.target.value)} />
              </Field>
            </div>
          )}

          <Field label="訊息範本" hint="可使用變數 {{metric}}、{{value}}">
            <TextArea rows={3} value={template} onChange={(e) => setTemplate(e.target.value)} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="靜音時段開始">
              <TextInput type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
            </Field>
            <Field label="靜音時段結束">
              <TextInput type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
            </Field>
          </div>
        </div>
      }
    />
  );
}
