"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Mic, MicOff, Send, Video, Radio, Loader2, Download, Sparkles } from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import { AGENTS } from "@/lib/agent-data";
import type { AgentSlug } from "@/lib/types";

type Phase = "idle" | "live" | "ended";

interface Reply {
  slug: string;
  name: string;
  text: string;
}

const TEAM_LEAD_SLUG: AgentSlug = "teamlead";

/* 語音辨識（Web Speech API）型別在標準 TS lib 沒有，這裡用最小宣告。 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function getSpeechRecognition(): any | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const cands = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return cands.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
}

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MeetingPage() {
  const teamLead = useMemo(() => AGENTS.find((a) => a.slug === TEAM_LEAD_SLUG)!, []);
  const responders = useMemo(
    () => AGENTS.filter((a) => a.status === "active" && a.slug !== TEAM_LEAD_SLUG),
    []
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [draft, setDraft] = useState(""); // 目前要送出的指令（語音填入、可手動編輯）
  const [interim, setInterim] = useState(""); // 語音辨識即時（未定稿）字幕
  const [thinking, setThinking] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // 本輪各 Agent 的回覆（slug -> text）與 Team Lead 統整
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [respondedSlugs, setRespondedSlugs] = useState<string[]>([]);
  const [leadSummary, setLeadSummary] = useState<string>("");
  const [log, setLog] = useState<{ command: string; teamlead: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ recordingSaved: boolean } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const startTsRef = useRef<number>(0);
  const fullTranscriptRef = useRef<string>(""); // 整場逐字稿（存檔用）

  useEffect(() => {
    // 語音辨識是 window-only API，掛載後才能判斷支援與否，故於 effect 設定
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeechSupported(Boolean(getSpeechRecognition()));
  }, []);

  // 計時器
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startRecognition = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.lang = "zh-TW";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0]?.transcript ?? "";
        if (res.isFinal) {
          const clean = txt.trim();
          if (clean) {
            fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + clean;
            setDraft((prev) => (prev ? `${prev} ${clean}` : clean));
          }
        } else {
          interimText += txt;
        }
      }
      setInterim(interimText);
    };
    rec.onend = () => {
      // 會議進行中若辨識自己結束（逾時），自動重啟以持續聆聽
      if (recognitionRef.current === rec && streamRef.current) {
        try {
          rec.start();
        } catch {
          /* 已在執行則忽略 */
        }
      }
    };
    rec.onerror = () => {
      /* 忽略單次辨識錯誤，onend 會嘗試重啟 */
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setMicOn(true);
    } catch {
      /* ignore */
    }
  }, []);

  const stopEverything = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    setMicOn(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopEverything(), [stopEverything]);

  const startMeeting = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      // 1) 建立會議
      const res = await fetch("/api/meeting/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `會議 ${new Date().toLocaleString("zh-TW")}` }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error(data.error || "無法建立會議");
      setMeetingId(data.id);

      // 2) 開鏡頭 + 麥克風
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // 3) 錄音（只錄音訊，檔案較小）
      const audioStream = new MediaStream(stream.getAudioTracks());
      const mime = pickAudioMime();
      chunksRef.current = [];
      try {
        const recorder = new MediaRecorder(audioStream, mime ? { mimeType: mime } : undefined);
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunksRef.current.push(ev.data);
        };
        recorder.start(1000);
        recorderRef.current = recorder;
      } catch {
        recorderRef.current = null; // 不支援錄音也讓會議照常進行
      }

      // 4) 語音轉文字
      fullTranscriptRef.current = "";
      startRecognition();

      startTsRef.current = Date.now();
      setElapsed(0);
      setPhase("live");
    } catch (err: any) {
      const name = err?.name;
      setError(
        name === "NotAllowedError"
          ? "需要鏡頭與麥克風權限才能開會，請允許授權後再試一次。"
          : err?.message || "無法啟動會議，請確認裝置的鏡頭與麥克風。"
      );
      stopEverything();
    } finally {
      setStarting(false);
    }
  }, [startRecognition, stopEverything]);

  const sendCommand = useCallback(async () => {
    const command = draft.trim();
    if (!command || !meetingId || thinking) return;
    setDraft("");
    setInterim("");
    setThinking(true);
    setReplies({});
    setRespondedSlugs([]);
    setLeadSummary("");
    try {
      const res = await fetch("/api/meeting/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, command }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "會議回應失敗");
      const repliesArr: Reply[] = Array.isArray(data.replies) ? data.replies : [];
      const map: Record<string, string> = {};
      repliesArr.forEach((r) => (map[r.slug] = r.text));
      setReplies(map);
      setRespondedSlugs(repliesArr.map((r) => r.slug));
      const lead = data.teamlead?.text ?? "";
      setLeadSummary(lead);
      setLog((prev) => [{ command, teamlead: lead }, ...prev]);
    } catch (err: any) {
      setLeadSummary(err?.message || "剛剛回應時遇到問題，請再說一次。");
    } finally {
      setThinking(false);
    }
  }, [draft, meetingId, thinking]);

  const endMeeting = useCallback(async () => {
    if (!meetingId) return;
    setSaving(true);
    const durationSeconds = Math.floor((Date.now() - startTsRef.current) / 1000);

    // 停止辨識、停止計時
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    setMicOn(false);

    // 停止錄音並等最後一塊資料
    const recorder = recorderRef.current;
    const audioBlob: Blob | null = await new Promise((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        resolve(chunksRef.current.length ? new Blob(chunksRef.current) : null);
        return;
      }
      recorder.onstop = () => {
        resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type: chunksRef.current[0]?.type }) : null);
      };
      try {
        recorder.stop();
      } catch {
        resolve(chunksRef.current.length ? new Blob(chunksRef.current) : null);
      }
    });
    recorderRef.current = null;

    // 關鏡頭麥克風
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // 上傳存檔
    try {
      const form = new FormData();
      form.append("meetingId", meetingId);
      form.append("transcript", fullTranscriptRef.current);
      form.append("durationSeconds", String(durationSeconds));
      if (audioBlob) {
        const ext = (audioBlob.type || "").includes("mp4") ? "mp4" : (audioBlob.type || "").includes("ogg") ? "ogg" : "webm";
        form.append("audio", audioBlob, `recording.${ext}`);
      }
      const res = await fetch("/api/meeting/finish", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      setSavedInfo({ recordingSaved: Boolean(data.recordingSaved) });
    } catch {
      setSavedInfo({ recordingSaved: false });
    } finally {
      setSaving(false);
      setPhase("ended");
    }
  }, [meetingId]);

  /* ───────────────────────── 畫面 ───────────────────────── */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      {/* 環境光暈 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[15%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(6,199,85,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[75vh] w-[75vh] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.12),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col px-5 py-5 sm:px-8">
        {/* 頂列 */}
        <header className="flex items-center justify-between">
          <Link
            href="/tv"
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/55 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={15} />
            劇院
          </Link>
          <p className="text-sm font-medium tracking-[0.3em] text-white/50">團 隊 會 議 室</p>
          {phase === "live" ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300">
                <span className="tv-breathe h-2 w-2 rounded-full bg-red-500" />
                REC {fmtClock(elapsed)}
              </span>
              <button
                type="button"
                onClick={endMeeting}
                disabled={saving}
                className="rounded-full bg-red-500/90 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
              >
                {saving ? "存檔中…" : "結束會議"}
              </button>
            </div>
          ) : (
            <span className="w-[120px]" />
          )}
        </header>

        {/* ───── 大廳（未開會） ───── */}
        {phase === "idle" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="tv-pop">
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                <Video size={34} className="text-[#06C755]" />
              </div>
              <h1 className="text-3xl font-light sm:text-4xl">開一場視訊會議</h1>
              <p className="mx-auto mt-4 max-w-lg text-white/50">
                開鏡頭與麥克風，用視訊向 AI 團隊下達語音指令。相關的 Agent 會即時回應、
                由 Team Lead <span className="text-white/70">{teamLead.personEn} {teamLead.personZh}</span> 統整，全程自動錄音存檔。
              </p>

              {/* 排排站預覽 */}
              <div className="mt-9 flex flex-wrap items-end justify-center gap-3">
                {[teamLead, ...responders].slice(0, 10).map((a) => (
                  <div key={a.slug} className="flex flex-col items-center gap-1.5">
                    <Avatar personEn={a.personEn} color={a.color} size={a.slug === TEAM_LEAD_SLUG ? 60 : 46} />
                    <span className="text-[11px] text-white/40">{a.personEn}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={startMeeting}
                disabled={starting}
                className="mt-11 inline-flex items-center gap-2.5 rounded-full bg-[#06C755] px-8 py-3.5 text-base font-semibold text-black shadow-[0_0_30px_-4px_rgba(6,199,85,0.7)] transition-transform hover:scale-105 disabled:opacity-60"
              >
                {starting ? <Loader2 size={18} className="animate-spin" /> : <Radio size={18} />}
                {starting ? "啟動中…" : "開會"}
              </button>

              {!speechSupported && (
                <p className="mt-5 text-xs text-amber-300/80">
                  這個瀏覽器不支援即時語音轉文字（建議用 Chrome）。仍可開會與錄音，指令改用打字送出。
                </p>
              )}
              {error && <p className="mt-5 max-w-md text-sm text-red-300">{error}</p>}
            </div>
          </div>
        )}

        {/* ───── 會議進行中 ───── */}
        {phase === "live" && (
          <div className="mt-5 grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {/* 左：主席視訊 + 指令列 */}
            <div className="flex flex-col gap-4">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="aspect-video w-full -scale-x-100 object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur">
                  你 · 主席
                </span>
                <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur">
                  {micOn ? <Mic size={13} className="text-[#06C755]" /> : <MicOff size={13} className="text-white/40" />}
                  {micOn ? "聆聽中" : "麥克風關閉"}
                </span>
                {/* 即時字幕 */}
                {(interim || draft) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
                    <p className="text-lg leading-snug">
                      <span className="text-white">{draft}</span>
                      <span className="text-white/45">{draft && interim ? " " : ""}{interim}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* 指令列 */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      sendCommand();
                    }
                  }}
                  rows={2}
                  placeholder={speechSupported ? "說話會自動填入這裡，也可以直接打字修改…" : "在這裡輸入要對團隊下的指令…"}
                  className="w-full resize-none bg-transparent px-2 py-1.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none"
                />
                <div className="mt-1 flex items-center justify-between px-1">
                  <span className="text-xs text-white/35">
                    {micOn ? "口述完點「送出指令」，或 ⌘/Ctrl + Enter" : "支援打字下指令"}
                  </span>
                  <button
                    type="button"
                    onClick={sendCommand}
                    disabled={!draft.trim() || thinking}
                    className="inline-flex items-center gap-2 rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#05b34c] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {thinking ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    送出指令
                  </button>
                </div>
              </div>
            </div>

            {/* 右：Team Lead 統整 + 會議紀錄 */}
            <div className="flex min-h-0 flex-col gap-4">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <Avatar personEn={teamLead.personEn} color={teamLead.color} size={44} />
                  <div>
                    <p className="text-sm font-medium">
                      {teamLead.personEn} {teamLead.personZh}
                      <span className="ml-2 text-xs text-white/40">{teamLead.role}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-[#06C755]">
                      <Sparkles size={12} /> 會議統整
                    </p>
                  </div>
                </div>
                {thinking ? (
                  <ThinkingLine label="正在聽取並統整團隊回覆…" />
                ) : leadSummary ? (
                  <p className="tv-in text-[15px] leading-relaxed text-white/90">{leadSummary}</p>
                ) : (
                  <p className="text-sm text-white/40">下一個指令，我會彙整團隊的回應給您。</p>
                )}
              </div>

              {/* 會議紀錄 */}
              <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-white/40">會議紀錄</p>
                {log.length === 0 ? (
                  <p className="text-sm text-white/30">尚無指令。對著鏡頭說出你的第一個指示吧。</p>
                ) : (
                  <ul className="space-y-3">
                    {log.map((l, i) => (
                      <li key={i} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                        <p className="text-sm text-white/85">
                          <span className="mr-1.5 text-xs text-[#06C755]">你：</span>
                          {l.command}
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                          <span className="mr-1 text-white/35">統整：</span>
                          {l.teamlead}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 下：Agent 排排站 */}
            <div className="lg:col-span-2">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {responders.map((a) => {
                  const replied = respondedSlugs.includes(a.slug);
                  const text = replies[a.slug];
                  return (
                    <div key={a.slug} className="flex w-[172px] shrink-0 flex-col items-center">
                      {/* 對話泡泡 */}
                      <div className="mb-2 flex h-24 w-full items-end justify-center">
                        {thinking ? (
                          <div className="w-full rounded-2xl rounded-b-sm border border-white/8 bg-white/[0.04] px-3 py-2">
                            <ThinkingDots />
                          </div>
                        ) : text ? (
                          <div className="tv-in max-h-24 w-full overflow-y-auto rounded-2xl rounded-b-sm border border-white/10 bg-white/[0.06] px-3 py-2 text-xs leading-relaxed text-white/85">
                            {text}
                          </div>
                        ) : null}
                      </div>
                      <div className="relative">
                        <Avatar personEn={a.personEn} color={a.color} size={54} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#05060a] ${
                            thinking ? "tv-breathe bg-amber-400" : replied ? "bg-[#06C755]" : "bg-white/25"
                          }`}
                        />
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-white/80">{a.personEn}</p>
                      <p className="text-[10px] text-white/35">{a.role}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ───── 已結束 ───── */}
        {phase === "ended" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="tv-pop w-full max-w-xl">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#06C755]/30 bg-[#06C755]/10">
                <Radio size={26} className="text-[#06C755]" />
              </div>
              <h2 className="text-2xl font-light">會議已結束</h2>
              <p className="mt-3 text-white/50">
                時長 {fmtClock(elapsed)}．{savedInfo?.recordingSaved ? "錄音已存檔" : "本場未產生錄音檔"}
                ，逐字稿與 {log.length} 則指令已保存。
              </p>

              {leadSummary && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-white/40">
                    <Sparkles size={12} className="text-[#06C755]" /> Team Lead 最後統整
                  </p>
                  <p className="text-[15px] leading-relaxed text-white/90">{leadSummary}</p>
                </div>
              )}

              <div className="mt-8 flex items-center justify-center gap-3">
                {savedInfo?.recordingSaved && meetingId && (
                  <a
                    href={`/api/meeting/recording?id=${meetingId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10"
                  >
                    <Download size={15} /> 取得錄音連結
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPhase("idle");
                    setLog([]);
                    setReplies({});
                    setRespondedSlugs([]);
                    setLeadSummary("");
                    setSavedInfo(null);
                    setMeetingId(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-[#06C755] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#05b34c]"
                >
                  <Video size={15} /> 再開一場
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function ThinkingDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 180, 360].map((d) => (
        <i
          key={d}
          className="tv-breathe block h-1.5 w-1.5 rounded-full bg-white/60"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}

function ThinkingLine({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2 text-sm text-white/60">
      <span className="flex h-3 items-end gap-[3px]">
        {[0, 120, 240, 360].map((d) => (
          <i
            key={d}
            className="tv-wave block w-[3px] rounded-full bg-[#06C755]"
            style={{ height: "100%", animationDelay: `${d}ms` }}
          />
        ))}
      </span>
      {label}
    </span>
  );
}
