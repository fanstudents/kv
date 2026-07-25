"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, FileUp, Loader2, Trash2, Upload } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { Select, TextArea, TextInput } from "@/components/ui/Field";
import {
  KNOWLEDGE_KIND_LABEL,
  KNOWLEDGE_LEVELS,
  levelInfo,
  type KnowledgeDoc,
  type KnowledgeKind,
  type KnowledgeLevel,
} from "@/lib/knowledge-base-data";

// 匯入頁：傳一份 PDF 進來 → 系統抽文字、切塊、請 AI 轉成問答／步驟／事實條目 →
// 全部先當「草稿」列在這裡等你一條一條審 → 通過的才發布上線。
// 沒按過發布的內容，永遠不會出現在任何 Agent 的 prompt 裡。

interface ImportResult {
  sourceId: string;
  filename: string;
  pageCount: number;
  chunkCount: number;
  processedChunks: number;
  candidateCount: number;
  truncated: boolean;
}

interface SourceRow {
  id: string;
  filename: string;
  page_count: number | null;
  status: string;
  created_at: string;
}

export default function KnowledgeImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [drafts, setDrafts] = useState<KnowledgeDoc[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    fetch("/api/knowledge-base/import")
      .then((r) => (r.ok ? r.json() : { sources: [] }))
      .then((d) => setSources(d.sources ?? []))
      .catch(() => {});
  }, [result]);

  const loadDrafts = async (sourceId: string) => {
    const res = await fetch(`/api/knowledge-base/import?sourceId=${encodeURIComponent(sourceId)}`);
    const data = await res.json().catch(() => ({ docs: [] }));
    setDrafts(data.docs ?? []);
  };

  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    setDone("");
    setDrafts([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/knowledge-base/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "匯入失敗");
      setResult(data as ImportResult);
      await loadDrafts(data.sourceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯入失敗");
    } finally {
      setBusy(false);
    }
  };

  const patchDraft = (id: string, patch: Partial<KnowledgeDoc>) =>
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const saveDraft = async (doc: KnowledgeDoc) => {
    await fetch("/api/knowledge-base", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        level: doc.level,
        kind: doc.kind,
        category: doc.category,
      }),
    }).catch(() => {});
  };

  const discard = async (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    await fetch("/api/knowledge-base/import", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
  };

  const publishAll = async () => {
    if (drafts.length === 0) return;
    setPublishing(true);
    try {
      // 先把畫面上改過的內容存回去，再一次發布
      await Promise.all(drafts.map(saveDraft));
      const res = await fetch("/api/knowledge-base/import", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: drafts.map((d) => d.id) }),
      });
      const data = await res.json();
      setDone(`已發布 ${data.published ?? 0} 條，Agent 現在讀得到了`);
      setDrafts([]);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="匯入知識"
        description="傳一份 PDF，系統會抽出內容並整理成問答／步驟條目——全部先當草稿，你審過才會上線"
        actions={
          <Link
            href="/knowledge-base"
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <ChevronLeft size={14} />
            回知識庫
          </Link>
        }
      />

      {/* 上傳 */}
      <Card className="mb-6">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center transition-colors hover:border-[#06C755] hover:bg-[#06C755]/[0.03] disabled:opacity-60 dark:border-neutral-700"
        >
          {busy ? (
            <>
              <Loader2 size={24} className="animate-spin text-[#06C755]" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                正在抽文字、切段落、請 AI 整理成條目…
              </span>
              <span className="text-xs text-neutral-400">一份幾十頁的文件大約需要 1-3 分鐘</span>
            </>
          ) : (
            <>
              <FileUp size={24} className="text-neutral-400" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">選擇 PDF 檔案</span>
              <span className="text-xs text-neutral-400">
                12MB 以內 · 掃描件需要先做 OCR · Word／簡報請先另存成 PDF
              </span>
            </>
          )}
        </button>

        {error && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
        {done && (
          <p className="mt-3 rounded-lg bg-[#06C755]/10 px-3 py-2 text-xs font-medium text-[#06C755]">{done}</p>
        )}
        {result && !error && (
          <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            《{result.filename}》共 {result.pageCount} 頁，切成 {result.chunkCount} 段，
            已處理 {result.processedChunks} 段，整理出 <span className="font-semibold">{result.candidateCount}</span> 條待審。
            {result.truncated && (
              <span className="text-amber-500">（單次上限，其餘段落未處理——可拆檔後再傳一次）</span>
            )}
          </p>
        )}
      </Card>

      {/* 人審 */}
      {drafts.length > 0 && (
        <Card className="mb-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              待審條目 <span className="text-neutral-400">{drafts.length}</span>
            </h2>
            <p className="text-xs text-neutral-400">改完直接發布；不要的條目按右邊丟掉</p>
            <button
              type="button"
              onClick={publishAll}
              disabled={publishing}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#06C755] px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              全部發布（{drafts.length}）
            </button>
          </div>

          <div className="space-y-3">
            {drafts.map((d) => {
              const flags = (d.meta?.flags as string[] | undefined) ?? [];
              const confidence = Number(d.meta?.confidence ?? 0);
              return (
                <div
                  key={d.id}
                  className="rounded-xl border border-neutral-200 p-3.5 dark:border-neutral-800"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className="rounded-full px-2 py-0.5 font-medium"
                      style={{
                        background: `${levelInfo(d.level).color}1A`,
                        color: levelInfo(d.level).color,
                      }}
                    >
                      {levelInfo(d.level).label}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      {KNOWLEDGE_KIND_LABEL[d.kind ?? "faq"]}
                    </span>
                    {d.sourcePage && <span className="text-neutral-400">第 {d.sourcePage} 頁</span>}
                    {confidence > 0 && (
                      <span className={confidence < 0.6 ? "text-amber-500" : "text-neutral-400"}>
                        忠實度 {Math.round(confidence * 100)}%
                      </span>
                    )}
                    {flags.length > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-300">
                        <AlertTriangle size={11} />
                        偵測到 {flags.join("、")}——已自動提高分級
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => discard(d.id)}
                      title="丟棄這一條"
                      className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <TextInput
                    value={d.title}
                    onChange={(e) => patchDraft(d.id, { title: e.target.value })}
                    className="mb-2 font-medium"
                    placeholder="問題"
                  />
                  <TextArea
                    value={d.content ?? ""}
                    onChange={(e) => patchDraft(d.id, { content: e.target.value })}
                    rows={3}
                    placeholder="答案"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Select
                      value={d.level}
                      onChange={(e) => patchDraft(d.id, { level: Number(e.target.value) as KnowledgeLevel })}
                      className="w-auto"
                    >
                      {KNOWLEDGE_LEVELS.map((lv) => (
                        <option key={lv.level} value={lv.level}>
                          {lv.label}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={d.kind ?? "faq"}
                      onChange={(e) => patchDraft(d.id, { kind: e.target.value as KnowledgeKind })}
                      className="w-auto"
                    >
                      {(Object.keys(KNOWLEDGE_KIND_LABEL) as KnowledgeKind[]).map((k) => (
                        <option key={k} value={k}>
                          {KNOWLEDGE_KIND_LABEL[k]}
                        </option>
                      ))}
                    </Select>
                    <TextInput
                      value={d.category}
                      onChange={(e) => patchDraft(d.id, { category: e.target.value })}
                      className="w-auto"
                      placeholder="分類"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 匯入過的檔案 */}
      {sources.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">匯入紀錄</h2>
          <ul className="space-y-1.5">
            {sources.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
              >
                <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-200">{s.filename}</span>
                <span className="text-xs text-neutral-400">{s.page_count ?? "—"} 頁</span>
                <span className="text-xs text-neutral-400">
                  {new Date(s.created_at).toLocaleDateString("zh-TW")}
                </span>
                <button
                  type="button"
                  onClick={() => loadDrafts(s.id)}
                  className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  看待審條目
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
