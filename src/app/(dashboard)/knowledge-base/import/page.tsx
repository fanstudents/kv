"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, FileUp, Globe, Loader2, Trash2, Upload } from "lucide-react";
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

// 匯入頁：傳一份 PDF、或給一個網址（Firecrawl 抓成乾淨正文）→ 系統切塊、請 AI 轉成問答／步驟／事實條目 →
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
  // 從網址匯入
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"single" | "site">("single");
  const [limit, setLimit] = useState(25);
  const [preview, setPreview] = useState<string>("");
  const [urlBusy, setUrlBusy] = useState(false);

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

  const previewSite = async () => {
    if (!url.trim()) return;
    setPreview("");
    setError("");
    try {
      const res = await fetch(`/api/knowledge-base/crawl?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "預覽失敗");
      setPreview(`這個站大約有 ${data.count} 頁；整站匯入會依「頁數上限」抓前面幾頁`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "預覽失敗");
    }
  };

  const importFromUrl = async () => {
    if (!url.trim()) return;
    setUrlBusy(true);
    setError("");
    setDone("");
    setDrafts([]);
    try {
      const res = await fetch("/api/knowledge-base/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), mode, limit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "匯入失敗");
      if (data.unchanged) {
        setDone("這個網址先前已匯入過，而且內容沒有變動——沒有產生新的待審條目。");
      } else {
        setResult({
          sourceId: data.sourceId,
          filename: data.url,
          pageCount: data.pageCount,
          chunkCount: data.chunkCount,
          processedChunks: data.processedChunks,
          candidateCount: data.candidateCount,
          truncated: data.truncated,
        });
        setDrafts(data.docs ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯入失敗");
    } finally {
      setUrlBusy(false);
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
        description="傳一份 PDF 或給一個網址，系統會整理成問答／步驟條目——全部先當草稿，你審過才會上線"
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

      {/* 從網址匯入 */}
      <Card className="mb-6">
        <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          <Globe size={15} className="text-[#0EA5E9]" />
          從網址匯入
        </h2>
        <p className="mb-4 text-xs text-neutral-400">
          官網、課程頁、說明文章直接餵進來——會抓成乾淨的正文（去掉導覽列與頁尾），
          再走跟 PDF 一樣的流程：轉條目 → 人審 → 發布。動態渲染的頁面也抓得到。
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/service"
            className="min-w-[16rem] flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0EA5E9] dark:border-neutral-700 dark:bg-neutral-950"
          />
          <div className="flex overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700">
            {(["single", "site"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  mode === m
                    ? "bg-[#0EA5E9] text-white"
                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                {m === "single" ? "單頁" : "整站"}
              </button>
            ))}
          </div>
          {mode === "site" && (
            <>
              <input
                type="number"
                value={limit}
                min={1}
                max={60}
                onChange={(e) => setLimit(Number(e.target.value) || 25)}
                title="頁數上限"
                className="w-20 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-950"
              />
              <button
                type="button"
                onClick={previewSite}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                先看有幾頁
              </button>
            </>
          )}
          <button
            type="button"
            onClick={importFromUrl}
            disabled={urlBusy || !url.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[#0EA5E9] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {urlBusy ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            {urlBusy ? "抓取中…" : "匯入"}
          </button>
        </div>
        {preview && <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{preview}</p>}
        {mode === "site" && (
          <p className="mt-2 text-[11px] text-amber-500">
            整站會依頁數上限逐頁抓取並轉換，時間與額度都比單頁多——建議先用「先看有幾頁」確認範圍。
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
