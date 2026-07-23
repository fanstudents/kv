"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Plus, Trash2, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field, TextInput, Select } from "@/components/ui/Field";
import Avatar from "@/components/agents/Avatar";
import { AGENTS } from "@/lib/agent-data";
import {
  AGENT_ACCESS_SEEDS,
  KNOWLEDGE_ACCESS_STORAGE_KEY,
  KNOWLEDGE_LEVELS,
  KNOWLEDGE_SEEDS,
  KNOWLEDGE_STORAGE_KEY,
  levelInfo,
  type KnowledgeDoc,
  type KnowledgeLevel,
} from "@/lib/knowledge-base-data";
import type { AgentSlug } from "@/lib/types";

/* ── 分級說明表：對照資料分級概念的四個等級 ── */
function LevelLegend() {
  return (
    <Card className="mb-6 overflow-x-auto">
      <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">資料分級說明</h2>
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold tracking-wide text-neutral-400">
            <th className="pb-2 pr-4">等級</th>
            <th className="pb-2 pr-4">資料類型</th>
            <th className="pb-2">建議 AI 使用方式</th>
          </tr>
        </thead>
        <tbody>
          {KNOWLEDGE_LEVELS.map((lv) => (
            <tr key={lv.level} className="border-t border-neutral-100 dark:border-neutral-800">
              <td className="py-2.5 pr-4">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${lv.color}1A`, color: lv.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {lv.label}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-neutral-600 dark:text-neutral-300">{lv.dataTypes}</td>
              <td className="py-2.5 text-neutral-500 dark:text-neutral-400">{lv.aiUsage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ── Agent × 等級 存取矩陣：點等級 pill 指派這位 Agent 的可讀上限 ── */
function AccessMatrix({
  access,
  onChange,
}: {
  access: Record<AgentSlug, KnowledgeLevel>;
  onChange: (slug: AgentSlug, level: KnowledgeLevel) => void;
}) {
  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Agent 讀取權限指派</h2>
      <p className="mb-4 text-xs text-neutral-400">
        點選等級即設定該 Agent 的可讀取上限——可讀到指定等級與以下的所有文件
      </p>
      <div className="space-y-1.5">
        {AGENTS.map((agent) => {
          const current = access[agent.slug] ?? 1;
          return (
            <div
              key={agent.slug}
              className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
            >
              <div className="flex w-44 shrink-0 items-center gap-2">
                <Avatar personEn={agent.personEn} color={agent.color} size={26} />
                <span className="min-w-0 truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  {agent.shortName} {agent.personEn}
                </span>
              </div>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {KNOWLEDGE_LEVELS.map((lv) => {
                  const active = current >= lv.level;
                  return (
                    <button
                      key={lv.level}
                      type="button"
                      onClick={() => onChange(agent.slug, lv.level)}
                      title={`設定 ${agent.shortName} 可讀取上限為 ${lv.label}`}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? ""
                          : "border-neutral-200 text-neutral-400 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-500"
                      }`}
                      style={
                        active
                          ? { backgroundColor: `${lv.color}1A`, borderColor: `${lv.color}66`, color: lv.color }
                          : undefined
                      }
                    >
                      L{lv.level}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── 頁面 ── */
export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(KNOWLEDGE_SEEDS);
  const [access, setAccess] = useState<Record<AgentSlug, KnowledgeLevel>>(AGENT_ACCESS_SEEDS);
  const [loaded, setLoaded] = useState(false);
  const [filterAgent, setFilterAgent] = useState<AgentSlug | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newLevel, setNewLevel] = useState<KnowledgeLevel>(1);

  // 異動存於瀏覽器 localStorage（介面示範，未接後端）
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const rawDocs = localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
        if (rawDocs) setDocs(JSON.parse(rawDocs));
        const rawAccess = localStorage.getItem(KNOWLEDGE_ACCESS_STORAGE_KEY);
        if (rawAccess) setAccess({ ...AGENT_ACCESS_SEEDS, ...JSON.parse(rawAccess) });
      } catch {
        /* 壞資料就回到種子 */
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(docs));
    } catch {
      /* 私密模式等情況忽略 */
    }
  }, [docs, loaded]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KNOWLEDGE_ACCESS_STORAGE_KEY, JSON.stringify(access));
    } catch {
      /* 私密模式等情況忽略 */
    }
  }, [access, loaded]);

  const setAgentAccess = (slug: AgentSlug, level: KnowledgeLevel) =>
    setAccess((prev) => ({ ...prev, [slug]: level }));

  const removeDoc = (id: string) => setDocs((prev) => prev.filter((d) => d.id !== id));

  const addDoc = () => {
    const title = newTitle.trim();
    if (!title) return;
    setDocs((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, title, category: newCategory.trim() || "未分類", level: newLevel },
    ]);
    setNewTitle("");
    setNewCategory("");
    setNewLevel(1);
    setAdding(false);
  };

  const filterAgentLevel = filterAgent ? (access[filterAgent] ?? 1) : null;

  const grouped = useMemo(() => {
    const map = new Map<KnowledgeLevel, KnowledgeDoc[]>();
    for (const lv of KNOWLEDGE_LEVELS) map.set(lv.level, []);
    for (const doc of docs) map.get(doc.level)?.push(doc);
    return map;
  }, [docs]);

  return (
    <div>
      <PageHeader
        title="知識庫"
        description="示範資料分級：內容依敏感度分為四級，只有被指派對應等級的 Agent 才能讀取"
        actions={
          <>
            <Badge tone="neutral">異動儲存於此瀏覽器（示範）</Badge>
            <button
              type="button"
              onClick={() => setAdding((a) => !a)}
              className="flex items-center gap-1.5 rounded-lg bg-[#06C755] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {adding ? <X size={15} /> : <Plus size={15} />}
              {adding ? "取消" : "新增文件"}
            </button>
          </>
        }
      />

      <LevelLegend />
      <AccessMatrix access={access} onChange={setAgentAccess} />

      {adding && (
        <Card className="mb-6">
          <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">新增知識庫文件</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="文件標題">
              <TextInput
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例如：退換貨政策"
                autoFocus
              />
            </Field>
            <Field label="分類">
              <TextInput
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="例如：SOP"
              />
            </Field>
            <Field label="分級" hint="決定哪些 Agent 能讀到這份文件">
              <Select value={newLevel} onChange={(e) => setNewLevel(Number(e.target.value) as KnowledgeLevel)}>
                {KNOWLEDGE_LEVELS.map((lv) => (
                  <option key={lv.level} value={lv.level}>
                    {lv.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <button
            type="button"
            onClick={addDoc}
            disabled={!newTitle.trim()}
            className="mt-4 rounded-lg bg-[#06C755] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            建立文件
          </button>
        </Card>
      )}

      {/* 依 Agent 篩選：點一位隊友，立刻看到他讀得到／讀不到哪些文件 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterAgent(null)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            filterAgent === null
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
              : "border-neutral-200 text-neutral-500 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400"
          }`}
        >
          全部文件
        </button>
        {AGENTS.map((agent) => (
          <button
            key={agent.slug}
            type="button"
            onClick={() => setFilterAgent((cur) => (cur === agent.slug ? null : agent.slug))}
            className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-medium transition-colors ${
              filterAgent === agent.slug
                ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
                : "border-neutral-200 text-neutral-500 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400"
            }`}
            title={`只看${agent.name}的可讀 / 不可讀文件`}
          >
            <Avatar personEn={agent.personEn} color={agent.color} size={22} />
            {agent.shortName} {agent.personEn}
          </button>
        ))}
      </div>

      {filterAgent && (
        <p className="mb-4 text-xs text-neutral-400">
          目前顯示：{AGENTS.find((a) => a.slug === filterAgent)?.name} 的可讀取上限為{" "}
          <span className="font-medium text-neutral-600 dark:text-neutral-300">
            {levelInfo(filterAgentLevel ?? 1).label}
          </span>
          ，超出等級的文件會顯示鎖定
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KNOWLEDGE_LEVELS.map((lv) => (
          <Card key={lv.level} className="flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: `${lv.color}1A`, color: lv.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {lv.label}
              </span>
              <span className="text-xs text-neutral-400">{grouped.get(lv.level)?.length ?? 0} 份</span>
            </div>
            <ul className="flex-1 space-y-1.5">
              {(grouped.get(lv.level) ?? []).map((doc) => {
                const locked = filterAgentLevel !== null && filterAgentLevel < doc.level;
                return (
                  <li
                    key={doc.id}
                    className={`group flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
                      locked
                        ? "opacity-40"
                        : filterAgent
                          ? "bg-[#06C755]/10"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    {locked ? (
                      <Lock size={13} className="mt-0.5 shrink-0 text-neutral-400" />
                    ) : (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: lv.color }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-neutral-700 dark:text-neutral-200">{doc.title}</p>
                      <p className="truncate text-xs text-neutral-400">{doc.category}</p>
                    </div>
                    {!doc.builtin && (
                      <button
                        type="button"
                        onClick={() => removeDoc(doc.id)}
                        className="shrink-0 rounded p-1 text-neutral-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        title="移除此文件"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </li>
                );
              })}
              {(grouped.get(lv.level) ?? []).length === 0 && (
                <li className="px-2 py-1.5 text-xs text-neutral-400">尚無文件</li>
              )}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
