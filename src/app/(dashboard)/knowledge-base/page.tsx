"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, FileUp, Loader2, Lock, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field, TextInput, TextArea, Select } from "@/components/ui/Field";
import Avatar from "@/components/agents/Avatar";
import LevelPipeline from "@/components/knowledge/LevelPipeline";
import { AGENTS } from "@/lib/agent-data";
import {
  KNOWLEDGE_KIND_LABEL,
  KNOWLEDGE_LEVELS,
  KNOWLEDGE_STATUS_LABEL,
  levelInfo,
  type KnowledgeDoc,
  type KnowledgeKind,
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
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [access, setAccess] = useState<Record<AgentSlug, KnowledgeLevel>>({} as Record<AgentSlug, KnowledgeLevel>);
  const [loaded, setLoaded] = useState(false);
  const [filterAgent, setFilterAgent] = useState<AgentSlug | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newLevel, setNewLevel] = useState<KnowledgeLevel>(1);
  const [newContent, setNewContent] = useState("");
  const [editing, setEditing] = useState<KnowledgeDoc | null>(null);
  const [notice, setNotice] = useState("");
  // 檢索索引：Agent 回答時是靠這個找相關內容，不是把整個知識庫倒進 prompt
  const [indexStats, setIndexStats] = useState<{ chunks: number; docs: number } | null>(null);
  const [reindexing, setReindexing] = useState(false);

  // 真實資料：文件與 Agent 讀取權限存在 Supabase（knowledge_base／knowledge_access 表），
  // 這裡編輯的異動會直接影響 Agent 對話時實際讀得到什麼內容（見 src/lib/knowledge-base.ts）。
  useEffect(() => {
    fetch("/api/knowledge-base/reindex")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.stats && setIndexStats(d.stats))
      .catch(() => {});
  }, []);

  const reindex = async () => {
    setReindexing(true);
    setNotice("");
    try {
      const res = await fetch("/api/knowledge-base/reindex", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "重建失敗");
      setIndexStats(data.stats ?? null);
      setNotice(`已重建索引：${data.indexable} 份文件、${data.chunks} 個可檢索段落`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "重建索引失敗");
    } finally {
      setReindexing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/knowledge-base")
      .then((res) => res.json())
      .then((data: { docs: KnowledgeDoc[]; access: Record<AgentSlug, KnowledgeLevel> }) => {
        if (cancelled) return;
        setDocs(data.docs ?? []);
        setAccess(data.access ?? ({} as Record<AgentSlug, KnowledgeLevel>));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setAgentAccess = (slug: AgentSlug, level: KnowledgeLevel) => {
    setAccess((prev) => ({ ...prev, [slug]: level }));
    fetch("/api/knowledge-base/access", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentSlug: slug, level }),
    }).catch(() => {});
  };

  // 刪除要看伺服器怎麼說：內建示範文件刪不掉，以前畫面會假裝刪掉、重整又跑回來
  const removeDoc = async (id: string) => {
    setNotice("");
    try {
      const res = await fetch(`/api/knowledge-base?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
        return;
      }
      const data = await res.json().catch(() => ({}));
      setNotice(data.error ?? "刪除失敗");
    } catch {
      setNotice("刪除失敗");
    }
  };

  /** 更新一份文件（編輯內容、改分級、封存／取消封存） */
  const patchDoc = async (id: string, patch: Partial<KnowledgeDoc>) => {
    setNotice("");
    const res = await fetch("/api/knowledge-base", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNotice(data.error ?? "更新失敗");
      return;
    }
    const doc: KnowledgeDoc = await res.json();
    setDocs((prev) => prev.map((d) => (d.id === id ? doc : d)));
  };

  const addDoc = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const res = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category: newCategory.trim() || "未分類",
          level: newLevel,
          content: newContent.trim() || undefined,
        }),
      });
      const doc: KnowledgeDoc = await res.json();
      if (res.ok) setDocs((prev) => [...prev, doc]);
    } catch {
      /* 新增失敗就不加入清單 */
    }
    setNewTitle("");
    setNewCategory("");
    setNewContent("");
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
            <Badge tone="success">{loaded ? "已接上真實資料庫" : "載入中…"}</Badge>
            <Link
              href="/knowledge-base/import"
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <FileUp size={15} />
              匯入 PDF
            </Link>
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

      {notice && (
        <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-2.5 text-xs text-amber-700 dark:text-amber-200">
          {notice}
        </p>
      )}

      {/* 檢索索引狀態 */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            <Search size={15} className="text-[#06C755]" />
            檢索索引
          </p>
          <p className="text-xs text-neutral-400">
            {indexStats
              ? `${indexStats.docs} 份文件、${indexStats.chunks} 個可檢索段落`
              : "讀取中…"}
            ——Agent 回答時只會取跟問題最相關的幾段，不是把整個知識庫塞進去
          </p>
          <button
            type="button"
            onClick={reindex}
            disabled={reindexing}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {reindexing ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {reindexing ? "重建中…" : "重建索引"}
          </button>
        </div>
      </Card>

      <LevelPipeline access={access} />
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
          <div className="mt-4">
            <Field label="內容" hint="這段文字就是 Agent 實際讀得到的內容——留空的話 Agent 只會看到標題">
              <TextArea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
                placeholder="例如：未拆封商品 7 天內可退貨，需保留原包裝與發票；已使用的商品不接受退貨。"
              />
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

      {editing && (
        <EditDialog
          doc={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await patchDoc(editing.id, patch);
            setEditing(null);
          }}
        />
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
                      <p className="flex items-center gap-1.5 truncate text-xs text-neutral-400">
                        {doc.category}
                        {doc.kind && doc.kind !== "doc" && <span>· {KNOWLEDGE_KIND_LABEL[doc.kind]}</span>}
                        {doc.sourcePage && <span>· 第 {doc.sourcePage} 頁</span>}
                        {doc.status && doc.status !== "published" && (
                          <span
                            className={`rounded px-1 py-px text-[10px] font-medium ${
                              doc.status === "draft"
                                ? "bg-amber-400/15 text-amber-600 dark:text-amber-300"
                                : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300"
                            }`}
                          >
                            {KNOWLEDGE_STATUS_LABEL[doc.status]}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(doc)}
                      className="shrink-0 rounded p-1 text-neutral-300 opacity-0 transition-opacity hover:text-neutral-700 group-hover:opacity-100 dark:hover:text-neutral-200"
                      title="編輯這份文件"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patchDoc(doc.id, { status: doc.status === "archived" ? "published" : "archived" })
                      }
                      className="shrink-0 rounded p-1 text-neutral-300 opacity-0 transition-opacity hover:text-amber-500 group-hover:opacity-100"
                      title={doc.status === "archived" ? "取消封存（重新讓 Agent 讀得到）" : "封存（Agent 不再讀到，但保留紀錄）"}
                    >
                      <Archive size={13} />
                    </button>
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

/* ── 編輯一份文件：原本只能刪掉重建，改一個錯字 id 都會變 ── */
function EditDialog({
  doc,
  onClose,
  onSave,
}: {
  doc: KnowledgeDoc;
  onClose: () => void;
  onSave: (patch: Partial<KnowledgeDoc>) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [category, setCategory] = useState(doc.category);
  const [content, setContent] = useState(doc.content ?? "");
  const [level, setLevel] = useState<KnowledgeLevel>(doc.level);
  const [kind, setKind] = useState<KnowledgeKind>(doc.kind ?? "doc");
  const [reviewAt, setReviewAt] = useState(doc.reviewAt ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button type="button" aria-label="關閉" onClick={onClose} className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2.5 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-white">
            編輯文件
            <span className="ml-2 text-xs font-normal text-neutral-400">
              v{doc.version ?? 1}
              {doc.updatedAt && ` · 最後更新 ${new Date(doc.updatedAt).toLocaleString("zh-TW")}`}
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <Field label="標題／問題">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="內容" hint="這段文字就是 Agent 實際讀得到的內容">
            <TextArea value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="分級">
              <Select value={level} onChange={(e) => setLevel(Number(e.target.value) as KnowledgeLevel)}>
                {KNOWLEDGE_LEVELS.map((lv) => (
                  <option key={lv.level} value={lv.level}>
                    {lv.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="型別">
              <Select value={kind} onChange={(e) => setKind(e.target.value as KnowledgeKind)}>
                {(Object.keys(KNOWLEDGE_KIND_LABEL) as KnowledgeKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KNOWLEDGE_KIND_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="分類">
              <TextInput value={category} onChange={(e) => setCategory(e.target.value)} />
            </Field>
          </div>
          <Field label="下次複檢日" hint="知識會過期——到期後這份文件會被標記為待複檢">
            <TextInput type="date" value={reviewAt} onChange={(e) => setReviewAt(e.target.value)} />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave({ title, category, content, level, kind, reviewAt: reviewAt || null })}
            className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}
