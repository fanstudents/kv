"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import type { ContactProfileRow } from "@/lib/contact-research";

// 約成之後自動產生的「行前功課」：對方是誰、公司在做什麼、最近有什麼動靜、
// 見面可以聊什麼。每一則都附來源連結，查得到才寫得出來。

function KindDot({ kind }: { kind?: string }) {
  const color =
    kind === "linkedin"
      ? "#0A66C2"
      : kind === "facebook"
        ? "#1877F2"
        : kind === "instagram"
          ? "#E4405F"
          : kind === "news"
            ? "#F59E0B"
            : "#06C755";
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />;
}

export default function ContactResearchPanel() {
  const [profiles, setProfiles] = useState<ContactProfileRow[] | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/agents/visit/research")
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((d) => setProfiles(d.profiles ?? []))
      .catch(() => setProfiles([]));

  useEffect(() => {
    load();
  }, []);

  const run = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/agents/visit/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), company: company.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "調查失敗");
      setProfiles(data.profiles ?? []);
      setName("");
      setCompany("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "調查失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          <Search size={15} className="text-[#0EA5E9]" />
          行前功課
        </h2>
        <button
          type="button"
          onClick={load}
          title="重新整理"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <RefreshCw size={13} />
        </button>
      </div>
      <p className="mb-4 text-xs text-neutral-400">
        對方一確認時段，Coco 就會上網查這個人與這家公司的公開資料（官網、新聞、專業社群、近期成果），
        整理成見面前先看一眼的背景卡。只查公開的專業資訊，查不到就寫查不到。
      </p>

      {/* 手動補做一份 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="姓名"
          className="w-32 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0EA5E9] dark:border-neutral-700 dark:bg-neutral-950"
        />
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="公司（選填）"
          className="w-40 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0EA5E9] dark:border-neutral-700 dark:bg-neutral-950"
        />
        <button
          type="button"
          onClick={run}
          disabled={busy || !name.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[#0EA5E9] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {busy ? "搜尋中…" : "手動調查"}
        </button>
        {error && <span className="self-center text-xs text-red-500">{error}</span>}
      </div>

      {profiles === null ? (
        <p className="text-xs text-neutral-400">載入中…</p>
      ) : profiles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-xs text-neutral-400 dark:border-neutral-700">
          還沒有背景資料——等下一次客戶確認時段，或在上面手動查一位試試。
        </p>
      ) : (
        <ul className="space-y-3">
          {profiles.map((p) => (
            <li key={p.id} className="rounded-xl border border-neutral-200 p-3.5 dark:border-neutral-800">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                  {p.person_name}
                  {p.company && <span className="ml-1.5 font-normal text-neutral-400">{p.company}</span>}
                </p>
                {p.status === "empty" && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    查無公開資料
                  </span>
                )}
                {p.status === "failed" && (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-500">調查失敗</span>
                )}
                <span className="ml-auto text-[11px] text-neutral-400">
                  {p.confidence > 0 && `可信度 ${Math.round(p.confidence * 100)}% · `}
                  {new Date(p.created_at).toLocaleDateString("zh-TW")}
                </span>
              </div>

              {p.company_summary && (
                <p className="mb-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                  <span className="text-neutral-400">公司　</span>
                  {p.company_summary}
                </p>
              )}
              {p.person_summary && (
                <p className="mb-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                  <span className="text-neutral-400">本人　</span>
                  {p.person_summary}
                </p>
              )}

              {p.highlights?.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {p.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#0EA5E9]" />
                      {h}
                    </li>
                  ))}
                </ul>
              )}

              {p.talking_points?.length > 0 && (
                <div className="mb-2 rounded-lg bg-[#0EA5E9]/[0.06] px-3 py-2">
                  <p className="mb-1 text-[10px] font-semibold tracking-wide text-[#0EA5E9]">見面可以聊</p>
                  <ul className="space-y-0.5">
                    {p.talking_points.map((t, i) => (
                      <li key={i} className="text-xs text-neutral-600 dark:text-neutral-300">
                        · {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {p.links?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.links.map((l, i) => (
                    <a
                      key={i}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-600 transition-colors hover:border-[#0EA5E9] hover:text-[#0EA5E9] dark:border-neutral-700 dark:text-neutral-300"
                    >
                      <KindDot kind={l.kind} />
                      {l.label}
                      <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
