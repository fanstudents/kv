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
  WifiOff,
  SkipForward,
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
// 停頓多久（毫秒）就視為「講完一段」，切一段語音去辨識、自動送給團隊回應。
const SILENCE_MS = 1100;
// 音量偵測 tick 間隔（毫秒）
const VAD_TICK_MS = 100;
// 自適應音量門檻：門檻 = clamp(環境噪音底 × 3, MIN, MAX)，會隨現場噪音自動調整。
// 不用單一固定值——固定值在不同麥克風增益下常「講話偵測不到」或「安靜卻一直誤觸」。
const VAD_MIN_THRESHOLD = 0.012;
const VAD_MAX_THRESHOLD = 0.08;
// 一段話至少要有這麼多毫秒的有效人聲才送辨識（過濾咳嗽、鍵盤聲、開關門）
const MIN_VOICED_MS = 400;
// 閒置太久就重啟切段錄音器：每段永遠是「從頭開始、含檔頭的完整檔案」，且檔案保持短小
const IDLE_RECYCLE_MS = 15000;
// 麥克風軌道健康檢查間隔（毫秒）——偵測到斷線就自動重新取得麥克風
const MIC_WATCHDOG_MS = 2000;
// 對外部 API 的單次請求逾時：任何一支卡住都不能讓整場會議跟著卡死
const FETCH_TIMEOUT_MS = 20000;

function fetchWithTimeout(input: RequestInfo, init: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

// 每位 Agent 固定配到 OpenAI TTS 的其中一種嗓音，聽起來像不同人、且比瀏覽器
// 內建的 speechSynthesis 自然許多。
const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
function voiceForSlug(slug: string): string {
  const h = Array.from(slug).reduce((a, c) => a + c.charCodeAt(0), 0);
  return OPENAI_VOICES[h % OPENAI_VOICES.length];
}

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const cands = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return cands.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
}

function audioExt(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
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
  // 語音辨識的偏向提示：列出所有同事姓名與常見業務詞彙，降低專有名詞誤判率。
  const transcribeHint = useMemo(
    () =>
      `會議情境：老闆與 AI 團隊成員（${[teamLead, ...responders]
        .map((a) => `${a.personEn} ${a.personZh}`)
        .join("、")}）開會。可能出現的詞彙：廣告成效、ROAS、CPA、行事曆、名片、拜訪邀約、KPI、排程、客服。`,
    [teamLead, responders]
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [draft, setDraft] = useState(""); // 手動模式下：辨識完的文字先放這裡讓你確認再送出
  const [isSpeakingUI, setIsSpeakingUI] = useState(false); // 真實音量偵測：你正在說話
  const [micLevel, setMicLevel] = useState(0); // 0~1，即時音量，用於畫面上的音量條
  const [transcribing, setTranscribing] = useState(false); // 語音辨識中（講完到文字回來的空檔）
  const [thinking, setThinking] = useState(false);
  const [agentTalking, setAgentTalking] = useState(false); // Agent 正在語音回覆（此時暫停聆聽，說完自動恢復）
  const [micOn, setMicOn] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null); // 麥克風斷線／恢復的提示
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
  const streamRef = useRef<MediaStream | null>(null); // 鏡頭＋麥克風的原始合併串流（畫面顯示、整體收尾用）
  const micStreamRef = useRef<MediaStream | null>(null); // 純麥克風軌道（VAD、逐段辨識、整場錄音都吃這個）
  const recorderRef = useRef<MediaRecorder | null>(null); // 整場會議錄音
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);
  const fullTranscriptRef = useRef<string>(""); // 整場逐字稿（存檔用，累積每一段辨識結果）

  // 音量偵測（VAD）與逐段語音辨識
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const utteranceRecorderRef = useRef<MediaRecorder | null>(null);
  const utteranceChunksRef = useRef<Blob[]>([]);
  const uttHasSpeechRef = useRef(false); // 這段錄音裡是否偵測到有效人聲
  const uttStartTsRef = useRef(0); // 這段錄音器的啟動時間（閒置回收用）
  const voicedMsRef = useRef(0); // 這段錄音中累積的有效人聲毫秒數
  const onsetCountRef = useRef(0); // 連續超過門檻的 tick 數（去抖動，避免單一雜訊誤觸）
  const noiseFloorRef = useRef(0.008); // 環境噪音底（滾動平均），自適應門檻的基準
  const lastVoiceTsRef = useRef(0);
  const recoveringMicRef = useRef(false);
  const pendingRef = useRef(""); // Agent 回應期間你又說的話，先排隊、回應完自動接續送出

  // 即時鏡像 ref（供計時器 / callback 讀取最新值，避免閉包過期）
  const thinkingRef = useRef(false);
  const autoRespondRef = useRef(true);
  const sendTextRef = useRef<(cmd: string) => void>(() => {});
  const transcribeHintRef = useRef(transcribeHint);

  // 語音回覆 + 揮手偵測所需
  const agentSpeakingRef = useRef(false); // Agent 正在語音回覆時，暫停偵測麥克風，避免把喇叭聲當成新指令
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentIndexRef = useRef(0);
  const nextAgentRef = useRef<() => void>(() => {});
  const gestureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const lastGestureTsRef = useRef(0);
  const gestureHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    thinkingRef.current = thinking;
  }, [thinking]);
  useEffect(() => {
    autoRespondRef.current = autoRespond;
  }, [autoRespond]);
  useEffect(() => {
    transcribeHintRef.current = transcribeHint;
  }, [transcribeHint]);
  const stopAgentAudioRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!voiceOn) stopAgentAudioRef.current();
  }, [voiceOn]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const flashGesture = useCallback((label: string) => {
    setGestureHint(label);
    if (gestureHintTimerRef.current) clearTimeout(gestureHintTimerRef.current);
    gestureHintTimerRef.current = setTimeout(() => setGestureHint(null), 1500);
  }, []);

  const flashMicNotice = useCallback((label: string, ttl = 3000) => {
    setMicNotice(label);
    if (micNoticeTimerRef.current) clearTimeout(micNoticeTimerRef.current);
    micNoticeTimerRef.current = setTimeout(() => setMicNotice(null), ttl);
  }, []);

  /* ── 音量偵測（VAD）：接上一個麥克風串流，建立 AnalyserNode ── */
  const setupAnalyser = useCallback((stream: MediaStream) => {
    try {
      audioCtxRef.current?.close().catch(() => {});
    } catch {
      /* ignore */
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    ctx.resume().catch(() => {});
  }, []);

  /* ── 開一個「全新的」切段錄音器。
   * 關鍵：WebM/Opus 只有第一塊資料帶檔頭，所以每段話都必須用一顆全新的
   * MediaRecorder 從頭錄——舊做法（一顆錄到底、切段只清陣列）切出來的第二段
   * 起全是無檔頭殘片，辨識必失敗，正是「講幾句就靜音」的元兇。 ── */
  const armUtterance = useCallback(() => {
    const stream = micStreamRef.current;
    if (!stream || stream.getAudioTracks()[0]?.readyState !== "live") return;
    utteranceChunksRef.current = [];
    uttHasSpeechRef.current = false;
    voicedMsRef.current = 0;
    onsetCountRef.current = 0;
    uttStartTsRef.current = Date.now();
    const mime = pickAudioMime();
    try {
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) utteranceChunksRef.current.push(ev.data);
      };
      rec.start(250);
      utteranceRecorderRef.current = rec;
    } catch {
      utteranceRecorderRef.current = null;
    }
  }, []);

  /* ── 排隊機制：Agent 思考／播音期間你說的話先存起來，空下來立刻接續送出 ── */
  const drainPending = useCallback(() => {
    if (thinkingRef.current || agentSpeakingRef.current) return;
    const text = pendingRef.current.trim();
    if (!text) return;
    pendingRef.current = "";
    sendTextRef.current(text);
  }, []);

  const routeText = useCallback((text: string) => {
    if (!autoRespondRef.current) {
      setDraft((prev) => (prev ? `${prev} ${text}` : text));
      return;
    }
    if (thinkingRef.current || agentSpeakingRef.current) {
      pendingRef.current = pendingRef.current ? `${pendingRef.current} ${text}` : text;
      return;
    }
    sendTextRef.current(text);
  }, []);

  const transcribeBlob = useCallback(
    (blob: Blob) => {
      setTranscribing(true);
      const form = new FormData();
      form.append("audio", blob, `utterance.${audioExt(blob.type || "audio/webm")}`);
      form.append("promptHint", transcribeHintRef.current);
      fetchWithTimeout("/api/meeting/transcribe", { method: "POST", body: form })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) throw new Error(d.error || "語音辨識失敗");
          const text = (d.text || "").trim();
          if (!text) return;
          fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + text;
          routeText(text);
        })
        .catch(() => {
          // 單次辨識失敗不中斷會議（音訊仍完整錄在整場錄音中）
        })
        .finally(() => setTranscribing(false));
    },
    [routeText]
  );

  /* ── 收尾這段錄音：stop() 會先 flush 完最後一塊再觸發 onstop，
   * 所以 onstop 裡拿到的一定是「含檔頭的完整檔案」；接著立刻開新的一段。 ── */
  const finishUtterance = useCallback(
    (send: boolean) => {
      const rec = utteranceRecorderRef.current;
      utteranceRecorderRef.current = null;
      const voicedMs = voicedMsRef.current;
      if (!rec || rec.state === "inactive") {
        armUtterance();
        return;
      }
      rec.onstop = () => {
        const chunks = utteranceChunksRef.current;
        utteranceChunksRef.current = [];
        if (send && voicedMs >= MIN_VOICED_MS && chunks.length > 0) {
          transcribeBlob(new Blob(chunks, { type: chunks[0]?.type || "audio/webm" }));
        }
        armUtterance();
      };
      try {
        rec.stop();
      } catch {
        armUtterance();
      }
    },
    [armUtterance, transcribeBlob]
  );

  /* ── VAD tick：每 100ms 讀一次音量，自適應門檻判斷「正在說話」或「已停頓」 ── */
  const vadTick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sumSq = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / data.length);
    setMicLevel(Math.min(1, rms * 4));

    if (agentSpeakingRef.current) return; // Agent 正在講話，忽略麥克風，避免把喇叭聲當新指令

    const threshold = Math.min(VAD_MAX_THRESHOLD, Math.max(VAD_MIN_THRESHOLD, noiseFloorRef.current * 3));
    if (rms > threshold) {
      onsetCountRef.current += 1;
      // 連續兩個 tick 以上才算開口（單一 tick 常是雜訊、關門聲）
      if (onsetCountRef.current >= 2) {
        uttHasSpeechRef.current = true;
        voicedMsRef.current += VAD_TICK_MS;
        lastVoiceTsRef.current = Date.now();
        setIsSpeakingUI(true);
      }
    } else {
      onsetCountRef.current = 0;
      // 安靜時滾動更新噪音底，讓門檻貼著現場環境走
      noiseFloorRef.current = noiseFloorRef.current * 0.95 + rms * 0.05;
      if (uttHasSpeechRef.current) {
        if (Date.now() - lastVoiceTsRef.current > SILENCE_MS) {
          setIsSpeakingUI(false);
          finishUtterance(true);
        }
      } else if (Date.now() - uttStartTsRef.current > IDLE_RECYCLE_MS) {
        finishUtterance(false); // 一直沒人講話：丟棄並重開，讓錄音段保持短小新鮮
      }
    }
  }, [finishUtterance]);

  /* ── 麥克風健康檢查：軌道意外斷線（裝置睡眠、藍牙耳機斷開…）就自動重新取得；
   * AudioContext 被瀏覽器暫停也在這裡喚醒（這是「開一陣子突然沒反應」的另一元兇） ── */
  const recoverMic = useCallback(async () => {
    if (recoveringMicRef.current) return;
    recoveringMicRef.current = true;
    setMicOn(false);
    flashMicNotice("麥克風中斷，重新連接中…", 6000);
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = fresh;
      setupAnalyser(fresh);
      armUtterance();

      // 整場錄音也一併換源，避免後半段整段沒聲音
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      const mime = pickAudioMime();
      const rec = new MediaRecorder(fresh, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.start(1000);
      recorderRef.current = rec;

      setMicOn(true);
      flashMicNotice("已重新接上麥克風 ✓");
    } catch {
      flashMicNotice("麥克風重新連接失敗，請確認裝置權限", 6000);
    } finally {
      recoveringMicRef.current = false;
    }
  }, [flashMicNotice, setupAnalyser, armUtterance]);

  const micWatchdog = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    const track = micStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    if (track.readyState !== "live" && !recoveringMicRef.current) {
      recoverMic();
    }
    // 切段錄音器意外死掉（少數瀏覽器在裝置切換時會發生）也自動重開
    if (track.readyState === "live" && !utteranceRecorderRef.current && !recoveringMicRef.current) {
      armUtterance();
    }
  }, [recoverMic, armUtterance]);

  /* ── Agent 說完話（或被跳過）的統一收尾：恢復聆聽、丟棄播音期間錄到的喇叭聲、送出排隊中的話 ── */
  const finishAgentSpeech = useCallback(() => {
    if (!agentSpeakingRef.current) return;
    agentSpeakingRef.current = false;
    setAgentTalking(false);
    finishUtterance(false); // 播音期間錄到的段落含喇叭聲，直接丟棄、重新乾淨聆聽
    drainPending();
  }, [finishUtterance, drainPending]);

  const stopAgentAudio = useCallback(() => {
    const audio = currentAudioRef.current;
    currentAudioRef.current = null;
    if (audio) {
      try {
        audio.pause();
      } catch {
        /* ignore */
      }
    }
    finishAgentSpeech();
  }, [finishAgentSpeech]);
  useEffect(() => {
    stopAgentAudioRef.current = stopAgentAudio;
  }, [stopAgentAudio]);

  // Agent 語音回覆：呼叫 OpenAI TTS，每位 Agent 固定一種嗓音。播放期間暫停麥克風偵測避免自我循環。
  const speak = useCallback(
    (text: string, slug: string) => {
      if (!text) return;
      const prev = currentAudioRef.current;
      currentAudioRef.current = null;
      if (prev) {
        try {
          prev.pause();
        } catch {
          /* ignore */
        }
      }
      agentSpeakingRef.current = true;
      setAgentTalking(true);
      fetchWithTimeout("/api/meeting/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceForSlug(slug) }),
      })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("語音合成失敗"))))
        .then((blob) => {
          if (!agentSpeakingRef.current) return; // 已被使用者跳過
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          currentAudioRef.current = audio;
          const done = () => {
            URL.revokeObjectURL(url);
            if (currentAudioRef.current === audio) currentAudioRef.current = null;
            finishAgentSpeech();
          };
          audio.onended = done;
          audio.onerror = done;
          audio.play().catch(done);
        })
        .catch(() => {
          finishAgentSpeech();
        });
    },
    [finishAgentSpeech]
  );

  // 換人：把「發言權」交給下一位（揮手 / 按鈕 / →鍵 都會呼叫）。
  // 若上一位還在播音會直接跳過；你排隊中的話會轉給新上場的這位。
  const goToAgent = useCallback(
    (idx: number) => {
      const n = roster.length;
      if (n === 0) return;
      const next = ((idx % n) + n) % n;
      currentIndexRef.current = next;
      setCurrentIndex(next);
      setReply(null);
      stopAgentAudio();
    },
    [roster.length, stopAgentAudio]
  );
  const nextAgent = useCallback(() => goToAgent(currentIndexRef.current + 1), [goToAgent]);
  useEffect(() => {
    nextAgentRef.current = nextAgent;
  }, [nextAgent]);

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

  // 揮手偵測 + 音量偵測（VAD）+ 麥克風健康檢查，三條迴圈僅在會議進行中運作
  useEffect(() => {
    if (phase !== "live") return;
    prevFrameRef.current = null;
    const gestureId = setInterval(() => detectGesture(), 120);
    const vadId = setInterval(() => vadTick(), VAD_TICK_MS);
    const watchdogId = setInterval(() => micWatchdog(), MIC_WATCHDOG_MS);
    return () => {
      clearInterval(gestureId);
      clearInterval(vadId);
      clearInterval(watchdogId);
    };
  }, [phase, detectGesture, vadTick, micWatchdog]);

  // →鍵：手動換下一位（demo 時的可靠備援，不受揮手偵測影響）
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

  const stopEverything = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
      } catch {
        /* ignore */
      }
      currentAudioRef.current = null;
    }
    agentSpeakingRef.current = false;
    setAgentTalking(false);
    pendingRef.current = "";
    const uttRec = utteranceRecorderRef.current;
    utteranceRecorderRef.current = null;
    if (uttRec) {
      uttRec.onstop = null; // 收尾時不要觸發「再開一段」
      uttRec.ondataavailable = null;
      try {
        uttRec.stop();
      } catch {
        /* ignore */
      }
    }
    try {
      audioCtxRef.current?.close().catch(() => {});
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setMicOn(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    micStreamRef.current = null;
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

      // 2) 開鏡頭 + 麥克風（開回音消除／降噪：Agent 用喇叭講話時不會殘留進你的麥克風）
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const micStream = new MediaStream(stream.getAudioTracks());
      micStreamRef.current = micStream;

      // 3) 整場錄音（只錄音訊，檔案較小）
      const mime = pickAudioMime();
      chunksRef.current = [];
      try {
        const recorder = new MediaRecorder(micStream, mime ? { mimeType: mime } : undefined);
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunksRef.current.push(ev.data);
        };
        recorder.start(1000);
        recorderRef.current = recorder;
      } catch {
        recorderRef.current = null; // 不支援錄音也讓會議照常進行
      }

      // 4) 音量偵測 + 逐段語音辨識（取代瀏覽器內建、不夠準確又容易斷線的 Web Speech API）
      setupAnalyser(micStream);
      armUtterance();
      setMicOn(true);

      fullTranscriptRef.current = "";
      pendingRef.current = "";
      startTsRef.current = Date.now();
      setElapsed(0);
      setPhase("live");
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      setError(
        e?.name === "NotAllowedError"
          ? "需要鏡頭與麥克風權限才能開會，請允許授權後再試一次。"
          : e?.message || "無法啟動會議，請確認裝置的鏡頭與麥克風。"
      );
      stopEverything();
    } finally {
      setStarting(false);
    }
  }, [setupAnalyser, armUtterance, stopEverything]);

  const sendCommandText = useCallback(
    async (raw: string) => {
      const command = raw.trim();
      if (!command || !meetingId || thinkingRef.current) return;
      thinkingRef.current = true;
      setDraft("");
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
          if (voiceOn) speak(r.text, r.slug);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "剛剛回應時遇到問題，請再說一次。";
        setReply({ slug: target.slug, name: `${target.personEn} ${target.personZh}`, text: message });
      } finally {
        thinkingRef.current = false;
        setThinking(false);
        // 沒有進入播音（語音關閉或合成失敗）就直接接續排隊中的話；有播音則等播完再接
        if (!agentSpeakingRef.current) drainPending();
      }
    },
    [meetingId, roster, speak, voiceOn, drainPending]
  );
  useEffect(() => {
    sendTextRef.current = sendCommandText;
  }, [sendCommandText]);

  const sendCommand = useCallback(() => sendCommandText(draft), [sendCommandText, draft]);

  const endMeeting = useCallback(async () => {
    if (!meetingId) return;
    setSaving(true);
    const durationSeconds = Math.floor((Date.now() - startTsRef.current) / 1000);

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
      } catch {
        /* ignore */
      }
      currentAudioRef.current = null;
    }
    agentSpeakingRef.current = false;
    setAgentTalking(false);
    pendingRef.current = "";

    const uttRec = utteranceRecorderRef.current;
    utteranceRecorderRef.current = null;
    if (uttRec) {
      uttRec.onstop = null; // 收尾時不要觸發「再開一段」
      uttRec.ondataavailable = null;
      try {
        uttRec.stop();
      } catch {
        /* ignore */
      }
    }
    try {
      audioCtxRef.current?.close().catch(() => {});
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setMicOn(false);

    // 停止整場錄音並等最後一塊資料
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
    micStreamRef.current = null;

    // 上傳存檔
    try {
      const form = new FormData();
      form.append("meetingId", meetingId);
      form.append("transcript", fullTranscriptRef.current);
      form.append("durationSeconds", String(durationSeconds));
      if (audioBlob) {
        form.append("audio", audioBlob, `recording.${audioExt(audioBlob.type || "")}`);
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

  const micBars = Math.round(micLevel * 5);

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
                    : agentTalking
                      ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
                      : transcribing
                        ? "border-sky-400/30 bg-sky-400/10 text-sky-200"
                        : "border-[#06C755]/30 bg-[#06C755]/10 text-[#06C755]"
                }`}
              >
                {thinking ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> 思考中
                  </>
                ) : agentTalking ? (
                  <>
                    <Volume2 size={13} /> 回覆中
                  </>
                ) : transcribing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> 辨識中
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

              <p className="mx-auto mt-5 max-w-md text-xs text-white/30">
                語音辨識與 Agent 語音回覆皆由 OpenAI 處理，不依賴瀏覽器內建語音功能，
                各主流瀏覽器（Chrome / Safari / Edge）皆可使用。
              </p>
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
                  isSpeakingUI ? "border-[#06C755]/60" : "border-white/10"
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
                {/* 麥克風斷線／恢復提示 */}
                {micNotice && (
                  <div className="tv-pop absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center">
                    <span className="flex items-center gap-2.5 rounded-full border border-amber-400/50 bg-black/75 px-5 py-2.5 text-sm font-semibold text-amber-200 backdrop-blur">
                      <WifiOff size={16} /> {micNotice}
                    </span>
                  </div>
                )}
                <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur">
                  {micOn ? <Mic size={13} className="text-[#06C755]" /> : <MicOff size={13} className="text-white/40" />}
                  {isSpeakingUI ? "說話中" : micOn ? "聆聽中" : "麥克風關閉"}
                  {micOn && (
                    <span className="ml-0.5 flex h-3 items-end gap-[2px]">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className="block w-[2px] rounded-full bg-[#06C755] transition-all"
                          style={{ height: `${i < micBars ? 30 + i * 15 : 20}%`, opacity: i < micBars ? 1 : 0.25 }}
                        />
                      ))}
                    </span>
                  )}
                </span>
                {/* 狀態字幕（電視台直播感，永遠在場） */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-12">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#06C755]/90">
                    <span className="tv-breathe h-1.5 w-1.5 rounded-full bg-[#06C755]" />
                    {isSpeakingUI ? "偵測到語音" : transcribing ? "語音辨識中" : agentTalking ? "語音回覆中" : "即時對話"}
                  </p>
                  {draft ? (
                    <p className="text-xl font-medium leading-snug text-white sm:text-2xl">{draft}</p>
                  ) : (
                    <p className="text-lg leading-snug text-white/35">
                      {thinking
                        ? `${currentAgent.personEn} 正在思考回應…`
                        : agentTalking
                          ? `${currentAgent.personEn} 語音回覆中，說完會自動繼續聽您說；想直接接話可點「跳過」`
                          : transcribing
                            ? "正在辨識您剛剛說的話…"
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
                  placeholder="說話會自動辨識後填入這裡，也可以直接打字修改…"
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
                      {autoRespond ? "說完停頓約 1 秒即自動送出" : "口述完點送出，或 ⌘/Ctrl + Enter"}
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
                    {agentTalking && (
                      <div className="mt-2.5 flex items-center gap-3">
                        <p className="flex items-center gap-1.5 text-xs text-white/40">
                          <Volume2 size={13} className="text-[#06C755]" /> 語音回覆中
                        </p>
                        <button
                          type="button"
                          onClick={stopAgentAudio}
                          className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <SkipForward size={11} /> 跳過，直接接話
                        </button>
                      </div>
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
              {/* 會議狀態條：清楚呈現「聆聽中 / 辨識中 / 團隊回應中」的現場感 */}
              <div
                className={`mb-4 flex items-center justify-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  thinking
                    ? "border-amber-400/25 bg-amber-400/[0.07] text-amber-100/90"
                    : agentTalking
                      ? "border-violet-400/25 bg-violet-400/[0.07] text-violet-200"
                      : transcribing
                        ? "border-sky-400/25 bg-sky-400/[0.07] text-sky-200"
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
                    {currentAgent.personEn} 正在思考回應…
                  </>
                ) : agentTalking ? (
                  <>
                    <Volume2 size={14} className="text-violet-300" />
                    <span className="text-violet-200">{currentAgent.personEn} 語音回覆中 · 說完自動繼續聆聽</span>
                  </>
                ) : transcribing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> 正在辨識您剛剛說的話…
                  </>
                ) : (
                  <>
                    <span className="tv-breathe h-2 w-2 rounded-full bg-[#06C755]" />
                    {isSpeakingUI
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
                          <div
                            className="tv-in max-h-24 w-full overflow-y-auto rounded-2xl rounded-b-sm border px-3 py-2 text-left text-xs leading-relaxed text-white/90"
                            style={{ borderColor: `${a.color}44`, background: `${a.color}14` }}
                          >
                            {text}
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={`relative rounded-full transition-all ${isCurrent ? "ring-2" : ""}`}
                        style={
                          isCurrent
                            ? { boxShadow: `0 0 24px -4px ${a.color}`, ["--tw-ring-color" as string]: `${a.color}88` }
                            : undefined
                        }
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
