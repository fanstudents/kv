"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Send,
  Video,
  Radio,
  Loader2,
  Download,
  Sparkles,
  Volume2,
  VolumeX,
  Hand,
} from "lucide-react";
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
// 停頓多久（毫秒）就視為「講完一段」，自動把指令送給團隊回應。
const SILENCE_MS = 1600;

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
  const [autoRespond, setAutoRespond] = useState(true); // 停頓即自動送出（即時對話感）

  // 一對一輪流：排排站順序（Team Lead 打頭陣，其餘依序），currentIndex 是現正對談的那位
  const roster = useMemo(() => [teamLead, ...responders], [teamLead, responders]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentAgent = roster[currentIndex] ?? roster[0];

  const [reply, setReply] = useState<{ slug: string; name: string; text: string } | null>(null);
  const [log, setLog] = useState<{ command: string; speaker: string; text: string }[]>([]);
  const [voiceOn, setVoiceOn] = useState(true); // Agent 是否用語音回覆
  const [gestureHint, setGestureHint] = useState<string | null>(null); // 揮手偵測提示
  const [saving, setSaving] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ recordingSaved: boolean } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const startTsRef = useRef<number>(0);
  const fullTranscriptRef = useRef<string>(""); // 整場逐字稿（存檔用）

  // 即時自動送出所需的鏡像 ref（供語音 callback / 計時器讀取最新值，避免閉包過期）
  const draftRef = useRef("");
  const thinkingRef = useRef(false);
  const autoRespondRef = useRef(true);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef("");
  const scheduleCommitRef = useRef<() => void>(() => {});
  const sendTextRef = useRef<(cmd: string) => void>(() => {});

  // 語音回覆 + 揮手偵測所需
  const speakingRef = useRef(false); // Agent 正在朗讀時，暫時忽略麥克風轉錄（避免自我循環）
  const voiceOnRef = useRef(true);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const currentIndexRef = useRef(0);
  const nextAgentRef = useRef<() => void>(() => {});
  const gestureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const lastGestureTsRef = useRef(0);
  const gestureHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    thinkingRef.current = thinking;
  }, [thinking]);
  useEffect(() => {
    autoRespondRef.current = autoRespond;
  }, [autoRespond]);
  useEffect(() => {
    voiceOnRef.current = voiceOn;
    if (!voiceOn && typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, [voiceOn]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // 載入語音合成的可用嗓音（非同步，voiceschanged 後才齊全）
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);

  useEffect(() => {
    // 語音辨識是 window-only API，掛載後才能判斷支援與否，故於 effect 設定
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeechSupported(Boolean(getSpeechRecognition()));
  }, []);

  // 停頓偵測：講完一段（靜默 SILENCE_MS）就自動把累積的口述送給團隊。
  const scheduleCommit = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      commitTimerRef.current = null;
      if (!autoRespondRef.current || thinkingRef.current || speakingRef.current) return;
      const text = draftRef.current.trim();
      if (text.length < 3 || text === lastSentRef.current) return;
      sendTextRef.current(text);
    }, SILENCE_MS);
  }, []);
  useEffect(() => {
    scheduleCommitRef.current = scheduleCommit;
  }, [scheduleCommit]);

  // Agent 語音回覆：依 slug 給不同嗓音／音高，聽起來像不同人。朗讀時暫停轉錄避免循環。
  const speak = useCallback((text: string, slug: string) => {
    if (!voiceOnRef.current || typeof window === "undefined" || !window.speechSynthesis || !text) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-TW";
    const h = Array.from(slug).reduce((a, c) => a + c.charCodeAt(0), 0);
    const zh = voicesRef.current.filter((v) => /zh|cmn|chinese|taiwan/i.test(`${v.lang} ${v.name}`));
    if (zh.length) u.voice = zh[h % zh.length];
    u.pitch = 0.85 + (h % 6) * 0.06; // 0.85 ~ 1.15
    u.rate = 0.98 + (h % 3) * 0.05; // 0.98 ~ 1.08
    speakingRef.current = true;
    u.onend = () => {
      speakingRef.current = false;
    };
    u.onerror = () => {
      speakingRef.current = false;
    };
    synth.speak(u);
  }, []);

  // 換人：把「發言權」交給下一位（揮手 / 按鈕 / →鍵 都會呼叫）
  const goToAgent = useCallback(
    (idx: number) => {
      const n = roster.length;
      if (n === 0) return;
      const next = ((idx % n) + n) % n;
      currentIndexRef.current = next;
      setCurrentIndex(next);
      setReply(null);
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      speakingRef.current = false;
    },
    [roster.length]
  );
  const nextAgent = useCallback(() => goToAgent(currentIndexRef.current + 1), [goToAgent]);
  useEffect(() => {
    nextAgentRef.current = nextAgent;
  }, [nextAgent]);

  const flashGesture = useCallback((label: string) => {
    setGestureHint(label);
    if (gestureHintTimerRef.current) clearTimeout(gestureHintTimerRef.current);
    gestureHintTimerRef.current = setTimeout(() => setGestureHint(null), 1500);
  }, []);

  // 揮手偵測：對鏡頭畫面做前後幀差分，偵測大幅度動作 → 換下一位（含冷卻，避免連續誤觸）
  const detectGesture = useCallback(() => {
    const video = videoRef.current;
    const canvas = gestureCanvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return;
    const w = 64;
    const h = 48;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const frame = ctx.getImageData(0, 0, w, h).data;
    const prev = prevFrameRef.current;
    prevFrameRef.current = frame;
    if (!prev) return;
    let changed = 0;
    for (let i = 0; i < frame.length; i += 4) {
      const d =
        Math.abs(frame[i] - prev[i]) +
        Math.abs(frame[i + 1] - prev[i + 1]) +
        Math.abs(frame[i + 2] - prev[i + 2]);
      if (d > 60) changed++;
    }
    const ratio = changed / (w * h);
    // 揮手＝畫面大範圍變動；門檻取 0.32，並設 2.5 秒冷卻
    if (ratio > 0.32 && Date.now() - lastGestureTsRef.current > 2500) {
      lastGestureTsRef.current = Date.now();
      flashGesture("偵測到揮手 · 換下一位");
      nextAgentRef.current();
    }
  }, [flashGesture]);

  // 計時器
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // 進入會議畫面後才有 <video> 元素，這時才把鏡頭串流接上去
  //（若在 setPhase 前接，ref 還是 null，畫面會是黑的）
  useEffect(() => {
    if (phase !== "live") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [phase]);

  // 揮手偵測迴圈（僅會議進行中）
  useEffect(() => {
    if (phase !== "live") return;
    prevFrameRef.current = null;
    const id = setInterval(() => detectGesture(), 120);
    return () => clearInterval(id);
  }, [phase, detectGesture]);

  // →／空白鍵：手動換下一位（demo 時的可靠備援，不受揮手偵測影響）
  useEffect(() => {
    if (phase !== "live") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextAgentRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const startRecognition = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    rec.lang = "zh-TW";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      // Agent 正在語音回覆時，麥克風會收到喇叭聲；忽略以免把 Agent 的話當成新指令。
      if (speakingRef.current) return;
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
      // 有語音活動就重設「停頓」計時；靜默 SILENCE_MS 後自動送出
      scheduleCommitRef.current();
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
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
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
    speakingRef.current = false;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
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

  const sendCommandText = useCallback(
    async (raw: string) => {
      const command = raw.trim();
      if (!command || !meetingId || thinkingRef.current) return;
      lastSentRef.current = command;
      thinkingRef.current = true;
      draftRef.current = "";
      setDraft("");
      setInterim("");
      setThinking(true);
      setReply(null);
      const target = roster[currentIndexRef.current] ?? roster[0];
      try {
        const res = await fetch("/api/meeting/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId, command, targetSlug: target.slug }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "會議回應失敗");
        const r: Reply | undefined = data.reply;
        if (r) {
          setReply(r);
          setLog((prev) => [{ command, speaker: r.name, text: r.text }, ...prev]);
          speak(r.text, r.slug);
        }
      } catch (err: any) {
        setReply({
          slug: target.slug,
          name: `${target.personEn} ${target.personZh}`,
          text: err?.message || "剛剛回應時遇到問題，請再說一次。",
        });
      } finally {
        thinkingRef.current = false;
        setThinking(false);
        // 你若在 Agent 回應期間又講了新的一段，稍後自動接續送出
        scheduleCommit();
      }
    },
    [meetingId, roster, scheduleCommit, speak]
  );
  useEffect(() => {
    sendTextRef.current = sendCommandText;
  }, [sendCommandText]);

  const sendCommand = useCallback(() => sendCommandText(draftRef.current || draft), [sendCommandText, draft]);

  const endMeeting = useCallback(async () => {
    if (!meetingId) return;
    setSaving(true);
    const durationSeconds = Math.floor((Date.now() - startTsRef.current) / 1000);

    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    speakingRef.current = false;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();

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
            <div className="flex items-center gap-2.5">
              <span
                className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium sm:flex ${
                  thinking
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                    : "border-[#06C755]/30 bg-[#06C755]/10 text-[#06C755]"
                }`}
              >
                {thinking ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> 團隊回應中
                  </>
                ) : (
                  <>
                    <span className="tv-breathe h-2 w-2 rounded-full bg-[#06C755]" /> 聆聽中
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => setVoiceOn((v) => !v)}
                title={voiceOn ? "關閉 Agent 語音回覆" : "開啟 Agent 語音回覆"}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                  voiceOn
                    ? "border-[#06C755]/40 bg-[#06C755]/10 text-[#06C755]"
                    : "border-white/12 bg-white/5 text-white/40"
                }`}
              >
                {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
              <span className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300">
                <span className="tv-breathe h-2 w-2 rounded-full bg-red-500" />
                LIVE {fmtClock(elapsed)}
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
                開鏡頭與麥克風，和 AI 團隊一對一輪流開會：由 Team Lead{" "}
                <span className="text-white/70">{teamLead.personEn} {teamLead.personZh}</span> 打頭陣，
                你說話、對方即時語音回覆；<span className="text-white/70">對鏡頭揮手</span>就換下一位上場。
                全程自動錄音存檔。
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
              <div
                className={`relative overflow-hidden rounded-2xl border bg-black transition-colors ${
                  interim ? "border-[#06C755]/60" : "border-white/10"
                }`}
              >
                <video
                  ref={videoRef}
                  muted
                  autoPlay
                  playsInline
                  className="aspect-video w-full -scale-x-100 object-cover"
                />
                {/* 揮手偵測用的隱藏縮圖畫布 */}
                <canvas ref={gestureCanvasRef} width={64} height={48} className="hidden" />
                <span className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur">
                  你 · 主席
                </span>
                <span className="absolute left-3 top-11 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white/60 backdrop-blur">
                  <Hand size={12} className="text-[#06C755]" /> 揮手＝換下一位
                </span>
                {/* 揮手偵測成功的提示 */}
                {gestureHint && (
                  <div className="tv-pop absolute inset-0 z-10 flex items-center justify-center bg-black/30">
                    <span className="flex items-center gap-2.5 rounded-full border border-[#06C755]/50 bg-black/70 px-5 py-2.5 text-base font-semibold text-[#06C755] backdrop-blur">
                      <Hand size={18} /> {gestureHint}
                    </span>
                  </div>
                )}
                <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur">
                  {micOn ? <Mic size={13} className="text-[#06C755]" /> : <MicOff size={13} className="text-white/40" />}
                  {interim ? "說話中" : micOn ? "聆聽中" : "麥克風關閉"}
                  {interim && (
                    <span className="ml-0.5 flex h-3 items-end gap-[2px]">
                      {[0, 120, 240].map((d) => (
                        <i
                          key={d}
                          className="tv-wave block w-[2px] rounded-full bg-[#06C755]"
                          style={{ height: "100%", animationDelay: `${d}ms` }}
                        />
                      ))}
                    </span>
                  )}
                </span>
                {/* 即時轉錄字幕（電視台直播感，永遠在場） */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-12">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#06C755]/90">
                    <span className="tv-breathe h-1.5 w-1.5 rounded-full bg-[#06C755]" />
                    即時轉錄
                  </p>
                  {draft || interim ? (
                    <p className="text-xl font-medium leading-snug sm:text-2xl">
                      <span className="text-white">{draft}</span>
                      <span className="text-white/50">
                        {draft && interim ? " " : ""}
                        {interim}
                      </span>
                    </p>
                  ) : (
                    <p className="text-lg leading-snug text-white/35">
                      {thinking
                        ? `${currentAgent.personEn} 正在回應您的指示…`
                        : `請對 ${currentAgent.personEn} ${currentAgent.personZh} 說出您的指示；揮手換下一位。`}
                    </p>
                  )}
                </div>
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
                <div className="mt-1 flex items-center justify-between gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => setAutoRespond((v) => !v)}
                    title="開啟後，講完停頓一下就自動請團隊回應；關閉則需手動送出"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      autoRespond
                        ? "border-[#06C755]/40 bg-[#06C755]/10 text-[#06C755]"
                        : "border-white/12 bg-white/5 text-white/50"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${autoRespond ? "tv-breathe bg-[#06C755]" : "bg-white/40"}`}
                    />
                    {autoRespond ? "停頓自動回應" : "手動送出"}
                  </button>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="hidden truncate text-xs text-white/35 sm:inline">
                      {autoRespond ? "說完停頓約 1.6 秒即自動送出" : "口述完點送出，或 ⌘/Ctrl + Enter"}
                    </span>
                    <button
                      type="button"
                      onClick={sendCommand}
                      disabled={!draft.trim() || thinking}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#05b34c] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {thinking ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      送出
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 右：現正對談的 Agent（聚光）+ 會議紀錄 */}
            <div className="flex min-h-0 flex-col gap-4">
              <div
                key={currentAgent.slug}
                className="tv-pop rounded-2xl border p-5"
                style={{
                  borderColor: `${currentAgent.color}55`,
                  background: `linear-gradient(135deg, ${currentAgent.color}14, rgba(255,255,255,0.02))`,
                }}
              >
                <div className="mb-3 flex items-center gap-4">
                  <div className="relative shrink-0">
                    <span
                      className="absolute -inset-2 rounded-full blur-xl"
                      style={{ background: `radial-gradient(circle, ${currentAgent.color}66, transparent 70%)` }}
                    />
                    <Avatar personEn={currentAgent.personEn} color={currentAgent.color} size={64} />
                    <span
                      className="tv-breathe absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-[#0b0d12] bg-[#06C755]"
                      style={{ boxShadow: "0 0 10px 2px rgba(6,199,85,0.6)" }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-medium">
                      {currentAgent.personEn} {currentAgent.personZh}
                      {currentAgent.slug === TEAM_LEAD_SLUG && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-[#06C755]">
                          <Sparkles size={11} /> Team Lead
                        </span>
                      )}
                    </p>
                    <p className="text-sm" style={{ color: currentAgent.color }}>
                      {currentAgent.role} · 現正對談
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={nextAgent}
                    title="換下一位（也可對鏡頭揮手或按 → 鍵）"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    下一位 <ChevronRight size={14} />
                  </button>
                </div>
                {thinking ? (
                  <ThinkingLine label={`${currentAgent.personEn} 正在思考回應…`} />
                ) : reply ? (
                  <div className="tv-in">
                    <p className="text-[15px] leading-relaxed text-white/90">{reply.text}</p>
                    {voiceOn && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
                        <Volume2 size={13} className="text-[#06C755]" /> 語音回覆中
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-white/45">
                    請直接對 {currentAgent.personEn} 說話；對鏡頭揮手即可換下一位。
                  </p>
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
                          <span className="mr-1 text-white/35">{l.speaker}：</span>
                          {l.text}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 下：Agent 排排站 */}
            <div className="lg:col-span-2">
              {/* 會議狀態條：清楚呈現「聆聽中 / 團隊回應中」的現場感 */}
              <div
                className={`mb-4 flex items-center justify-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  thinking
                    ? "border-amber-400/25 bg-amber-400/[0.07] text-amber-100/90"
                    : "border-[#06C755]/25 bg-[#06C755]/[0.07] text-[#06C755]"
                }`}
              >
                {thinking ? (
                  <>
                    <span className="flex h-3.5 items-end gap-[3px]">
                      {[0, 120, 240, 360].map((d) => (
                        <i
                          key={d}
                          className="tv-wave block w-[3px] rounded-full bg-amber-300"
                          style={{ height: "100%", animationDelay: `${d}ms` }}
                        />
                      ))}
                    </span>
                    團隊正在回應您的指示…
                  </>
                ) : (
                  <>
                    <span className="tv-breathe h-2 w-2 rounded-full bg-[#06C755]" />
                    {interim
                      ? `正在對 ${currentAgent.personEn} 說話…`
                      : `現在與 ${currentAgent.personEn} ${currentAgent.personZh} 對談 · 對鏡頭揮手換下一位`}
                  </>
                )}
              </div>
              <div className="flex items-end gap-3 overflow-x-auto pb-2">
                {roster.map((a, i) => {
                  const isCurrent = i === currentIndex;
                  const text = isCurrent && reply?.slug === a.slug ? reply.text : null;
                  return (
                    <button
                      key={a.slug}
                      type="button"
                      onClick={() => goToAgent(i)}
                      title={`與 ${a.personEn} 對談`}
                      className={`flex shrink-0 flex-col items-center text-center transition-all focus:outline-none ${
                        isCurrent ? "w-[200px]" : "w-[128px] opacity-45 hover:opacity-80"
                      }`}
                    >
                      {/* 對話泡泡：只出現在現正對談的這位頭上 */}
                      <div className="mb-2 flex h-24 w-full items-end justify-center">
                        {isCurrent && thinking ? (
                          <div className="w-full rounded-2xl rounded-b-sm border border-white/8 bg-white/[0.04] px-3 py-2">
                            <ThinkingDots />
                          </div>
                        ) : text ? (
                          <div className="tv-in max-h-24 w-full overflow-y-auto rounded-2xl rounded-b-sm border px-3 py-2 text-left text-xs leading-relaxed text-white/90"
                            style={{ borderColor: `${a.color}44`, background: `${a.color}14` }}
                          >
                            {text}
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={`relative rounded-full transition-all ${
                          isCurrent
                            ? "ring-2"
                            : ""
                        }`}
                        style={isCurrent ? { boxShadow: `0 0 24px -4px ${a.color}`, ["--tw-ring-color" as string]: `${a.color}88` } : undefined}
                      >
                        <Avatar personEn={a.personEn} color={a.color} size={isCurrent ? 76 : 50} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#05060a] ${
                            isCurrent
                              ? thinking
                                ? "tv-breathe bg-amber-400"
                                : "tv-breathe bg-[#06C755]"
                              : "bg-white/25"
                          }`}
                        />
                      </div>
                      <p className={`mt-1.5 font-medium ${isCurrent ? "text-sm text-white" : "text-xs text-white/70"}`}>
                        {a.personEn}
                        {a.slug === TEAM_LEAD_SLUG && <span className="ml-1 text-[10px] text-[#06C755]">Lead</span>}
                      </p>
                      <p className={`${isCurrent ? "text-[11px]" : "text-[10px]"} text-white/35`}>{a.role}</p>
                      {isCurrent && (
                        <span
                          className="mt-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                          style={{ background: `${a.color}22`, color: a.color }}
                        >
                          發言中
                        </span>
                      )}
                    </button>
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

              {log.length > 0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-white/40">
                    <Sparkles size={12} className="text-[#06C755]" /> 最後一段對話
                  </p>
                  <p className="text-sm text-white/70">你：{log[0].command}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/90">
                    <span className="text-white/45">{log[0].speaker}：</span>
                    {log[0].text}
                  </p>
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
                    setReply(null);
                    setCurrentIndex(0);
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
