"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextInput, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";

const agent = getAgent("operations")!;

interface ProductLine {
  name: string;
  status: "進行中" | "規劃中" | "暫停" | "已完成";
  owner: string;
  nextStep: string;
}

const DEFAULT_LINES: ProductLine[] = [
  { name: "企業內訓", status: "進行中", owner: "Jason", nextStep: "確認 Q3 三家客戶的課綱與講師排程" },
  { name: "公開課程", status: "進行中", owner: "Ivy", nextStep: "8 月梯次開放報名，準備行銷素材" },
  { name: "AI 導入", status: "規劃中", owner: "Kevin", nextStep: "整理導入評估問卷，預計下週提案" },
  { name: "一對一陪跑", status: "進行中", owner: "Jason", nextStep: "本週完成 2 位學員的期中檢核" },
  { name: "其他專案", status: "暫停", owner: "—", nextStep: "待資源到位後重啟" },
];

const STATUS_TONE: Record<ProductLine["status"], "success" | "warning" | "danger" | "neutral"> = {
  進行中: "success",
  規劃中: "warning",
  暫停: "danger",
  已完成: "neutral",
};

export default function OperationsAgentPage() {
  const [lines, setLines] = useState<ProductLine[]>(DEFAULT_LINES);

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (Array.isArray(s.lines) && s.lines.length > 0) setLines(s.lines as ProductLine[]);
  }, []);

  const updateLine = <K extends keyof ProductLine>(i: number, field: K, value: ProductLine[K]) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  };

  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const previewText =
    `營運週報｜${lines.length} 條產品線\n` +
    lines.map((l) => `・${l.name}［${l.status}］${l.owner !== "—" ? `${l.owner}｜` : ""}${l.nextStep}`).join("\n");

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.operations}
      onSettingsLoaded={onSettingsLoaded}
      previewText={previewText}
      previewTitle="營運儀表板 + 週報預覽"
      testPushLabel="傳送營運週報測試"
      settings={{ lines }}
      settingsForm={
        <div className="space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
                <TextInput
                  value={line.name}
                  onChange={(e) => updateLine(i, "name", e.target.value)}
                  placeholder="產品線名稱"
                />
                <Select value={line.status} onChange={(e) => updateLine(i, "status", e.target.value as ProductLine["status"])}>
                  <option value="進行中">進行中</option>
                  <option value="規劃中">規劃中</option>
                  <option value="暫停">暫停</option>
                  <option value="已完成">已完成</option>
                </Select>
                <TextInput value={line.owner} onChange={(e) => updateLine(i, "owner", e.target.value)} placeholder="負責人" />
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="flex items-center justify-center rounded-lg border border-neutral-300 p-2 text-neutral-400 hover:text-red-500 dark:border-neutral-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-2">
                <Field label="下一步">
                  <TextInput value={line.nextStep} onChange={(e) => updateLine(i, "nextStep", e.target.value)} />
                </Field>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { name: "", status: "規劃中", owner: "", nextStep: "" }])}
            className="flex items-center gap-1 text-xs font-medium text-[#06C755]"
          >
            <Plus size={14} /> 新增產品線 / 專案
          </button>
        </div>
      }
      preview={
        <div className="space-y-4">
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 p-2.5 text-xs dark:border-neutral-800">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">{l.name}</span>
                  <Badge tone={STATUS_TONE[l.status]}>{l.status}</Badge>
                </div>
                {l.owner !== "—" && l.owner && <p className="text-neutral-400">負責人：{l.owner}</p>}
                <p className="mt-1 text-neutral-600 dark:text-neutral-300">下一步：{l.nextStep || "（尚未填寫）"}</p>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}
