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
  Zap,
  Table2,
  BarChart3,
  Quote,
  X,
} from "lucide-react";
import LiveAvatar from "@/components/meeting/LiveAvatar";
import { AGENTS } from "@/lib/agent-data";
import { RealtimeVoiceSession } from "@/lib/realtime-voice";
import type { AgentSlug } from "@/lib/types";

type Phase = "idle" | "live" | "ended";

/** Agent 呼叫 show_result 工具推上畫面的內容——跟語音同步呈現，不用你自己從逐字稿腦補。 */
interface SharedResult {
  agentSlug: string;
  color: string;
  kind: "table" | "chart" | "metrics" | "text" | "conclusion";
  title: string;
  text?: string;
  table?: { columns: string[]; rows: string[][] };
  chart?: { label: string; value: number }[];
  metrics?: { label: string; value: string }[];
}

const TEAM_LEAD_SLUG: AgentSlug = "teamlead";
// 麥克風軌道健康檢查間隔——偵測到斷線就自動換軌（不必整個重連）
const MIC_WATCHDOG_MS = 2000;
// 對外部 API 的單次請求逾時：任何一支卡住都不能讓整場會議跟著卡死
const FETCH_TIMEOUT_MS = 15000;

// 每位 Agent 依「人設性別」固定配一種 Realtime 嗓音。限縮在幾種確定支援的
// 嗓音上（而不是猜整個清單都能用），降低連線失敗風險；同一嗓音在不同 Agent
// 身上會因 instructions 的人設描述講出不同味道，不代表聽起來完全一樣。
const REALTIME_VOICE: Record<string, string> = {
  teamlead: "shimmer", // Vivian（女）
  report: "coral", // Ivy（女）
  card: "sage", // Sunny（女）
  visit: "shimmer", // Coco（女）
  today: "coral", // Dana（女）
  support: "sage", // Amber（女）
  notify: "echo", // Kevin（男）
  schedule: "ash", // Milo（男）
  expense: "ballad", // Leo（男）
  competitor: "echo", // Jay（男）
  operations: "ash", // Morgan（男）
  orders: "ballad", // Ray（男）
};
function voiceForSlug(slug: string): string {
  return REALTIME_VOICE[slug] ?? "alloy";
}

function fetchWithTimeout(input: RequestInfo, init: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(id));
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
  const roster = useMemo(() => [teamLead, ...responders], [teamLead, responders]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [draft, setDraft] = useState(""); // 手動打字送出（跟語音共用同一個即時對話）
  const [isSpeakingUI, setIsSpeakingUI] = useState(false); // 伺服器端真實偵測到你在說話
  const [responding, setResponding] = useState(false); // 你講完到 Agent 開口之間的極短空檔
  const [agentTalking, setAgentTalking] = useState(false); // Agent 正在語音回覆（逐字字幕同步跑）
  const [connecting, setConnecting] = useState(false); // 正在切換／建立即時語音連線
  const [assistantCaption, setAssistantCaption] = useState(""); // 逐字累積的當輪回覆
  const [micOn, setMicOn] = useState(false);
  const [micLevel, setMicLevel] = useState(0); // 純視覺用音量條（不驅動任何判斷邏輯）
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true); // 靜音 Agent 語音（回覆與逐字稿仍照常）

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentAgent = roster[currentIndex] ?? roster[0];

  const [reply, setReply] = useState<{ slug: string; name: string; text: string } | null>(null);
  const [resultPanel, setResultPanel] = useState<SharedResult | null>(null); // Agent 推上畫面的報告內容
  const [log, setLog] = useState<{ command: string; speaker: string; text: string }[]>([]);
  const [gestureHint, setGestureHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ recordingSaved: boolean } | null>(null);
  const [lastVoiceAgo, setLastVoiceAgo] = useState<number | null>(null); // 引擎心跳，卡住時能立刻定位

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null); // 播放 Agent 即時語音

  const streamRef = useRef<MediaStream | null>(null); // 鏡頭＋麥克風合併串流（畫面顯示、整體收尾用）
  const micStreamRef = useRef<MediaStream | null>(null); // 純麥克風軌道，接進即時語音連線
  const recorderRef = useRef<MediaRecorder | null>(null); // 整場會議錄音（錄混音後的雙方語音）
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef(0);
  const fullTranscriptRef = useRef(""); // 整場逐字稿（存檔用，累積雙方文字）
  const lastUserTextRef = useRef(""); // 最近一句老闆說的話（配對會議紀錄用）
  const meetingIdRef = useRef<string | null>(null);

  // 混音圖：把「你」與「每一位上場過的 Agent」的語音一起餵進整場錄音，
  // 換人也不中斷（同一張圖活整場會議）
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mixDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const levelAnalyserRef = useRef<AnalyserNode | null>(null);

  const rtSessionRef = useRef<RealtimeVoiceSession | null>(null);
  const connectedIndexRef = useRef(-1); // rtSessionRef 目前實際連到哪一位（currentIndexRef 是「意圖」，連線中會先跑在前面）
  const agentSpeakingRef = useRef(false);
  const lastVoiceTsRef = useRef(0);
  const switchTokenRef = useRef(0); // 切換序號：手速太快時，讓過期的連線結果自動失效

  const currentIndexRef = useRef(0);
  const connectAgentRef = useRef<(idx: number, opts?: { carryText?: string }) => void>(() => {});
  const gestureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const lastGestureTsRef = useRef(0);
  const gestureHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveringMicRef = useRef(false);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    meetingIdRef.current = meetingId;
  }, [meetingId]);
  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.muted = !voiceOn;
  }, [voiceOn]);

  const flashGesture = useCallback((label: string) => {
    setGestureHint(label);
    if (gestureHintTimerRef.current) clearTimeout(gestureHintTimerRef.current);
    gestureHintTimerRef.current = setTimeout(() => setGestureHint(null), 1800);
  }, []);

  const flashMicNotice = useCallback((label: string, ttl = 3000) => {
    setMicNotice(label);
    if (micNoticeTimerRef.current) clearTimeout(micNoticeTimerRef.current);
    micNoticeTimerRef.current = setTimeout(() => setMicNotice(null), ttl);
  }, []);

  /** 每一句（老闆說的／Agent 回覆的）都個別存檔，即時對話沒有「一輪一次」的批次時機可搭。 */
  const logTurn = useCallback(
    (input: { role: "boss" | "agent" | "teamlead"; agentSlug?: string; speaker?: string; content: string }) => {
      const mid = meetingIdRef.current;
      if (!mid || !input.content) return;
      fetch("/api/meeting/log-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: mid, ...input }),
      }).catch(() => {});
    },
    []
  );

  const detectNamedAgent = useCallback(
    (text: string): number | null => {
      const lower = text.toLowerCase();
      for (let i = 0; i < roster.length; i++) {
        const a = roster[i];
        if (lower.includes(a.personEn.toLowerCase()) || text.includes(a.personZh)) return i;
      }
      return null;
    },
    [roster]
  );

  /* ── 純視覺的音量條：只影響畫面，不驅動任何判斷（真正的語音偵測交給 OpenAI 伺服器端） ── */
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => {
      const analyser = levelAnalyserRef.current;
      if (!analyser) return;
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSq += v * v;
      }
      setMicLevel(Math.min(1, Math.sqrt(sumSq / data.length) * 4));
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  /* ── 換人／點名：關掉舊的即時語音連線，向新 Agent 的人設換一組新的連線。
   * carryText：點名當下說的那句話，會直接轉交給新上場的 Agent 回答，不必你再說一次。 ── */
  /**
   * 換人／點名：先接上新 Agent 的連線，「確認連上了」才關掉舊的那條——
   * 不要先斷後接。之前的版本是先關舊連線、才去換 token／建新連線，中間有一段
   * （網路來回一趟的時間）完全沒有任何連線在聽你說話；會議進行到中後段、
   * 你講話的當下如果剛好落在這個空窗，就會像「叫不動」。現在舊連線會一直
   * 聽到新的確實連上為止，換人失敗也不會把整個會議弄啞（舊連線留著）。
   */
  const connectAgent = useCallback(
    async (idx: number, opts?: { carryText?: string }) => {
      const n = roster.length;
      if (n === 0) return;
      const next = ((idx % n) + n) % n;

      // 已經是現在這位：不必重連，若有帶話要接續就直接餵給現有連線
      if (next === connectedIndexRef.current && rtSessionRef.current) {
        if (opts?.carryText) {
          lastUserTextRef.current = opts.carryText;
          rtSessionRef.current.sendText(opts.carryText);
        }
        return;
      }

      const myToken = ++switchTokenRef.current;
      const outgoing = rtSessionRef.current; // 先留著，等新的連上才關
      setConnecting(true);
      // 立刻更新「現正對談」讓畫面反映意圖（連線中疊層會顯示是誰）；
      // 實際的 WebRTC 連線／舊連線收尾則等新連線確認就緒才切換
      currentIndexRef.current = next;
      setCurrentIndex(next);

      const agent = roster[next];
      const micTrack = micStreamRef.current?.getAudioTracks()[0];
      if (!micTrack) {
        setConnecting(false);
        return;
      }

      try {
        const res = await fetchWithTimeout("/api/meeting/realtime-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: agent.slug, meetingId: meetingIdRef.current, voice: voiceForSlug(agent.slug) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "無法建立即時語音連線");
        if (myToken !== switchTokenRef.current) return; // 使用者手速更快，這次切換已經過期

        const session = new RealtimeVoiceSession({
          onRemoteTrack: (stream) => {
            if (myToken !== switchTokenRef.current) return;
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = stream;
              remoteAudioRef.current.play().catch(() => {});
            }
            try {
              const ctx = audioCtxRef.current;
              const dest = mixDestRef.current;
              if (ctx && dest) ctx.createMediaStreamSource(stream).connect(dest);
            } catch {
              /* 混音失敗不影響對話本身，只是這位的聲音不會進整場錄音 */
            }
          },
          onUserSpeechStart: () => {
            if (myToken !== switchTokenRef.current) return;
            lastVoiceTsRef.current = Date.now();
            setIsSpeakingUI(true);
          },
          onUserSpeechStop: () => {
            if (myToken !== switchTokenRef.current) return;
            setIsSpeakingUI(false);
            setResponding(true);
          },
          onUserTranscript: (text) => {
            if (!text || myToken !== switchTokenRef.current) return;
            lastVoiceTsRef.current = Date.now();
            lastUserTextRef.current = text;
            fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + text;
            logTurn({ role: "boss", speaker: "老闆", content: text });
            // 除錯用：換人一直失敗時，打開瀏覽器 devtools 看這行就知道逐字稿有沒有抓對名字
            console.debug("[meeting] 老闆說：", text);

            const pureSwitch = /^(換人|換下一位|下一位|下一個|換一個)[吧喔哦。！!？?\s]*$/.test(text.trim());
            if (pureSwitch) {
              flashGesture("語音口令 · 換下一位");
              connectAgentRef.current(currentIndexRef.current + 1);
              return;
            }
            // 快速路徑：逐字稿裡直接看到名字就先切；模型自己聽到原始語音後
            // 也會透過 switch_to_colleague 工具再判斷一次（見 onFunctionCall），
            // 兩條路徑互為備援——這正是修正「中後期叫不動」的關鍵，因為純文字
            // 比對在辨識誤差、口音變化時會漏判，但模型直接聽聲音準得多。
            const named = detectNamedAgent(text);
            if (named !== null && named !== currentIndexRef.current) {
              flashGesture(`點名 ${roster[named].personEn} ${roster[named].personZh} 上場`);
              connectAgentRef.current(named, { carryText: text });
            }
          },
          onAssistantTranscriptDelta: (delta) => {
            if (myToken !== switchTokenRef.current) return;
            setResponding(false);
            agentSpeakingRef.current = true;
            setAgentTalking(true);
            setAssistantCaption((prev) => prev + delta);
          },
          onAssistantSpeechStart: () => {
            if (myToken !== switchTokenRef.current) return;
            setResponding(false);
            agentSpeakingRef.current = true;
            setAgentTalking(true);
          },
          onAssistantTranscriptDone: (text) => {
            if (myToken !== switchTokenRef.current) return;
            const speakerName = `${agent.personEn} ${agent.personZh}`;
            if (text) {
              fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + text;
              setReply({ slug: agent.slug, name: speakerName, text });
              setLog((prev) => [{ command: lastUserTextRef.current, speaker: speakerName, text }, ...prev]);
              logTurn({
                role: agent.slug === TEAM_LEAD_SLUG ? "teamlead" : "agent",
                agentSlug: agent.slug,
                speaker: speakerName,
                content: text,
              });
            }
            setAssistantCaption("");
          },
          onAssistantSpeechStop: () => {
            if (myToken !== switchTokenRef.current) return;
            agentSpeakingRef.current = false;
            setAgentTalking(false);
          },
          onFunctionCall: (name, argsJson, callId) => {
            if (myToken !== switchTokenRef.current) return;
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(argsJson);
            } catch {
              /* ignore */
            }
            if (name === "switch_to_colleague") {
              const target = typeof args.target === "string" ? args.target : "";
              session.submitFunctionResult(callId, { ok: true }, false); // 準備關掉這條連線，不必再要求它繼續講
              const targetIdx = roster.findIndex((a) => a.slug === target);
              if (targetIdx !== -1 && targetIdx !== currentIndexRef.current) {
                flashGesture(`${roster[targetIdx].personEn} ${roster[targetIdx].personZh} 接手回覆`);
                connectAgentRef.current(targetIdx);
              }
              return;
            }
            if (name === "show_result") {
              setResultPanel({
                agentSlug: agent.slug,
                color: agent.color,
                kind: (args.kind as SharedResult["kind"]) || "text",
                title: typeof args.title === "string" ? args.title : "",
                text: typeof args.text === "string" ? args.text : undefined,
                table: args.table as SharedResult["table"],
                chart: args.chart as SharedResult["chart"],
                metrics: args.metrics as SharedResult["metrics"],
              });
              session.submitFunctionResult(callId, { ok: true, shown: true }, true);
            }
          },
          onError: (msg) => {
            if (myToken !== switchTokenRef.current) return;
            flashMicNotice(msg, 5000);
          },
          onClose: () => {
            if (myToken !== switchTokenRef.current) return;
            agentSpeakingRef.current = false;
            setAgentTalking(false);
          },
        });

        await session.connect(data.token, micTrack);
        if (myToken !== switchTokenRef.current) {
          session.close();
          return;
        }

        // 新連線確認就緒，這時才切換——中間沒有任何「完全聽不到」的空窗
        outgoing?.close();
        rtSessionRef.current = session;
        connectedIndexRef.current = next;
        setConnecting(false);
        setMicOn(true);
        agentSpeakingRef.current = false;
        setAgentTalking(false);
        setResponding(false);
        setAssistantCaption("");
        setReply(null);
        setResultPanel(null);

        if (opts?.carryText) {
          lastUserTextRef.current = opts.carryText;
          session.sendText(opts.carryText);
        }
      } catch (err) {
        if (myToken !== switchTokenRef.current) return;
        setConnecting(false);
        flashMicNotice(err instanceof Error ? err.message : "無法建立即時語音連線", 6000);
        // 換人失敗：舊連線完全沒動過，會議不會因此變啞
      }
    },
    [roster, detectNamedAgent, logTurn, flashGesture, flashMicNotice]
  );
  useEffect(() => {
    connectAgentRef.current = connectAgent;
  }, [connectAgent]);

  const nextAgent = useCallback(() => connectAgent(currentIndexRef.current + 1), [connectAgent]);
  const goToAgent = useCallback((idx: number) => connectAgent(idx), [connectAgent]);

  /* ── 麥克風健康檢查：軌道意外斷線就重新取得，直接換軌（replaceTrack）不必整個重連。
   * AudioContext 被瀏覽器暫停也在這裡喚醒。 ── */
  const recoverMic = useCallback(async () => {
    if (recoveringMicRef.current) return;
    recoveringMicRef.current = true;
    setMicOn(false);
    flashMicNotice("麥克風中斷，重新連接中…", 6000);
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const newTrack = fresh.getAudioTracks()[0];
      micStreamRef.current = fresh;
      if (newTrack) {
        await rtSessionRef.current?.replaceMicTrack(newTrack);
        try {
          levelAnalyserRef.current?.disconnect();
        } catch {
          /* ignore */
        }
        const ctx = audioCtxRef.current;
        if (ctx) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(fresh).connect(analyser);
          levelAnalyserRef.current = analyser;
        }
      }
      setMicOn(true);
      flashMicNotice("已重新接上麥克風 ✓");
    } catch {
      flashMicNotice("麥克風重新連接失敗，請確認裝置權限", 6000);
    } finally {
      recoveringMicRef.current = false;
    }
  }, [flashMicNotice]);

  const micWatchdog = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    const track = micStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    if (track.readyState !== "live" && !recoveringMicRef.current) recoverMic();
  }, [recoverMic]);

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
    if (ratio > 0.32 && Date.now() - lastGestureTsRef.current > 2500) {
      lastGestureTsRef.current = Date.now();
      flashGesture("偵測到揮手 · 換下一位");
      connectAgentRef.current(currentIndexRef.current + 1);
    }
  }, [flashGesture]);

  // 計時器 + 引擎心跳（顯示距離上次聽到語音多久，卡住時能立刻看出是哪一段沒動）
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
      setLastVoiceAgo(lastVoiceTsRef.current ? Math.round((Date.now() - lastVoiceTsRef.current) / 1000) : null);
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // 進入會議畫面後才有 <video> 元素，這時才把鏡頭串流接上去
  useEffect(() => {
    if (phase !== "live") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [phase]);

  // 揮手偵測 + 麥克風健康檢查，僅會議進行中運作
  useEffect(() => {
    if (phase !== "live") return;
    prevFrameRef.current = null;
    const gestureId = setInterval(() => detectGesture(), 120);
    const watchdogId = setInterval(() => micWatchdog(), MIC_WATCHDOG_MS);
    return () => {
      clearInterval(gestureId);
      clearInterval(watchdogId);
    };
  }, [phase, detectGesture, micWatchdog]);

  // →鍵：手動換下一位（demo 時的可靠備援，不受揮手偵測影響）
  useEffect(() => {
    if (phase !== "live") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        connectAgentRef.current(currentIndexRef.current + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const stopEverything = useCallback(() => {
    rtSessionRef.current?.close();
    rtSessionRef.current = null;
    agentSpeakingRef.current = false;
    setAgentTalking(false);
    try {
      audioCtxRef.current?.close().catch(() => {});
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    mixDestRef.current = null;
    levelAnalyserRef.current = null;
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
      const res = await fetch("/api/meeting/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `會議 ${new Date().toLocaleString("zh-TW")}` }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error(data.error || "無法建立會議");
      setMeetingId(data.id);
      meetingIdRef.current = data.id;

      // 開鏡頭＋麥克風（回音消除／降噪／自動增益：跟 Agent 語音同時進行時避免回授雜訊）
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

      // 混音圖：你的聲音 + 每一位上場過的 Agent 語音，一起餵進整場錄音
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const dest = ctx.createMediaStreamDestination();
      ctx.createMediaStreamSource(micStream).connect(dest);
      const levelAnalyser = ctx.createAnalyser();
      levelAnalyser.fftSize = 512;
      ctx.createMediaStreamSource(micStream).connect(levelAnalyser);
      audioCtxRef.current = ctx;
      mixDestRef.current = dest;
      levelAnalyserRef.current = levelAnalyser;

      const mime = pickAudioMime();
      chunksRef.current = [];
      try {
        const recorder = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined);
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunksRef.current.push(ev.data);
        };
        recorder.start(1000);
        recorderRef.current = recorder;
      } catch {
        recorderRef.current = null;
      }

      fullTranscriptRef.current = "";
      startTsRef.current = Date.now();
      setElapsed(0);
      setPhase("live");

      // Team Lead 打頭陣，開第一條即時語音連線
      connectAgent(0);
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
  }, [connectAgent, stopEverything]);

  /** 手動打字送出：跟語音走同一個即時連線，直接塞進對話並要求回覆。 */
  const sendCommand = useCallback(() => {
    const text = draft.trim();
    if (!text || !rtSessionRef.current) return;
    setDraft("");
    lastUserTextRef.current = text;
    lastVoiceTsRef.current = Date.now();
    fullTranscriptRef.current += (fullTranscriptRef.current ? " " : "") + text;
    logTurn({ role: "boss", speaker: "老闆", content: text });
    rtSessionRef.current.sendText(text);
  }, [draft, logTurn]);

  const cancelReply = useCallback(() => {
    rtSessionRef.current?.cancelResponse();
    agentSpeakingRef.current = false;
    setAgentTalking(false);
    setAssistantCaption("");
  }, []);

  const endMeeting = useCallback(async () => {
    if (!meetingId) return;
    setSaving(true);
    const durationSeconds = Math.floor((Date.now() - startTsRef.current) / 1000);

    rtSessionRef.current?.close();
    rtSessionRef.current = null;
    agentSpeakingRef.current = false;
    setAgentTalking(false);
    setMicOn(false);

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

    try {
      audioCtxRef.current?.close().catch(() => {});
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    mixDestRef.current = null;
    levelAnalyserRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    micStreamRef.current = null;

    try {
      const form = new FormData();
      form.append("meetingId", meetingId);
      form.append("transcript", fullTranscriptRef.current);
      form.append("durationSeconds", String(durationSeconds));
      if (audioBlob) form.append("audio", audioBlob, `recording.${audioExt(audioBlob.type || "")}`);
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
  const displayText = assistantCaption || reply?.text || "";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
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
          <p className="flex items-center gap-2 text-sm font-medium tracking-[0.3em] text-white/50">
            團 隊 會 議 室
            <span className="hidden items-center gap-1 rounded-full border border-[#06C755]/25 bg-[#06C755]/10 px-2 py-0.5 text-[10px] tracking-normal text-[#06C755] sm:flex">
              <Zap size={10} /> 即時語音
            </span>
          </p>
          {phase === "live" ? (
            <div className="flex items-center gap-2.5">
              <span
                className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium sm:flex ${
                  connecting
                    ? "border-blue-400/30 bg-blue-400/10 text-blue-200"
                    : agentTalking
                      ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
                      : responding
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                        : "border-[#06C755]/30 bg-[#06C755]/10 text-[#06C755]"
                }`}
              >
                {connecting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> 連線中
                  </>
                ) : agentTalking ? (
                  <>
                    <Volume2 size={13} /> 回覆中
                  </>
                ) : responding ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> 思考中
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
                開鏡頭與麥克風，跟 AI 團隊即時語音對話——像 ChatGPT 語音模式一樣，你講話立刻有回應，
                不用等它「處理完」。由 Team Lead{" "}
                <span className="text-white/70">{teamLead.personEn} {teamLead.personZh}</span> 打頭陣，
                <span className="text-white/70">對鏡頭揮手</span>換下一位，或直接
                <span className="text-white/70">叫名字點名</span>（「Coco 你覺得如何？」）換人上場。
                全程自動錄音存檔。
              </p>

              <div className="mt-9 flex flex-wrap items-end justify-center gap-3">
                {[teamLead, ...responders].slice(0, 10).map((a) => (
                  <div key={a.slug} className="flex flex-col items-center gap-1.5">
                    <LiveAvatar
                      personEn={a.personEn}
                      color={a.color}
                      size={a.slug === TEAM_LEAD_SLUG ? 60 : 46}
                      slug={a.slug}
                    />
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
                建議戴耳機：鏡頭麥克風與 Agent 語音會同時進行，戴耳機能避免喇叭聲被麥克風收回去。
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
                {/* 播放 Agent 即時語音（隱藏，畫面由字幕呈現） */}
                <audio ref={remoteAudioRef} autoPlay className="hidden" />
                <canvas ref={gestureCanvasRef} width={64} height={48} className="hidden" />
                <span className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur">
                  你 · 主席
                </span>
                <span className="absolute left-3 top-11 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white/60 backdrop-blur">
                  <Hand size={12} className="text-[#06C755]" /> 揮手／叫名字＝換人
                </span>
                {gestureHint && (
                  <div className="tv-pop absolute inset-0 z-10 flex items-center justify-center bg-black/30">
                    <span className="flex items-center gap-2.5 rounded-full border border-[#06C755]/50 bg-black/70 px-5 py-2.5 text-base font-semibold text-[#06C755] backdrop-blur">
                      <Hand size={18} /> {gestureHint}
                    </span>
                  </div>
                )}
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
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-12">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#06C755]/90">
                    <span className="tv-breathe h-1.5 w-1.5 rounded-full bg-[#06C755]" />
                    {agentTalking ? "即時語音回覆中" : "即時對話"}
                  </p>
                  {displayText ? (
                    <p className="text-xl font-medium leading-snug text-white sm:text-2xl">{displayText}</p>
                  ) : (
                    <p className="text-lg leading-snug text-white/35">
                      {connecting
                        ? "連線中…"
                        : responding
                          ? `${currentAgent.personEn} 正在回應…`
                          : `請對 ${currentAgent.personEn} ${currentAgent.personZh} 說出您的指示；揮手或叫名字換人。`}
                    </p>
                  )}
                </div>
              </div>

              {/* 指令列（跟語音走同一個即時連線） */}
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
                  placeholder="也可以直接打字補充一句，會即時送進對話…"
                  className="w-full resize-none bg-transparent px-2 py-1.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none"
                />
                <div className="mt-1 flex items-center justify-between gap-2 px-1">
                  <span className="truncate text-xs text-white/35">
                    語音全程即時聆聽，不需要按送出
                    {lastVoiceAgo !== null && (
                      <span className="ml-2 text-white/25">· 上次聽到語音 {lastVoiceAgo}s 前</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={sendCommand}
                    disabled={!draft.trim()}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#05b34c] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send size={15} />
                    送出
                  </button>
                </div>
              </div>
            </div>

            {/* 右：現正對談的 Agent（聚光）+ 會議紀錄 */}
            <div className="flex min-h-0 flex-col gap-4">
              {/* Agent 報告時同步推上畫面的內容（表格／圖表／數字／結論），跟語音同步呈現 */}
              {resultPanel && <ResultPanelView result={resultPanel} onClose={() => setResultPanel(null)} />}

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
                    <LiveAvatar
                      personEn={currentAgent.personEn}
                      color={currentAgent.color}
                      size={64}
                      slug={currentAgent.slug}
                      talking={agentTalking}
                    />
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
                    title="換下一位（也可對鏡頭揮手、叫名字，或按 → 鍵）"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    下一位 <ChevronRight size={14} />
                  </button>
                </div>
                {connecting ? (
                  <ThinkingLine label={`正在連上 ${currentAgent.personEn}…`} />
                ) : displayText ? (
                  <div className="tv-in">
                    <p className="text-[15px] leading-relaxed text-white/90">{displayText}</p>
                    {agentTalking && (
                      <div className="mt-2.5 flex items-center gap-3">
                        <p className="flex items-center gap-1.5 text-xs text-white/40">
                          <Volume2 size={13} className="text-[#06C755]" /> 語音回覆中
                        </p>
                        <button
                          type="button"
                          onClick={cancelReply}
                          className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <SkipForward size={11} /> 跳過，直接接話
                        </button>
                      </div>
                    )}
                  </div>
                ) : responding ? (
                  <ThinkingLine label={`${currentAgent.personEn} 正在回應…`} />
                ) : (
                  <p className="text-sm text-white/45">
                    請直接對 {currentAgent.personEn} 說話——即時語音，講完立刻有回應。
                  </p>
                )}
              </div>

              {/* 會議紀錄 */}
              <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-white/40">會議紀錄</p>
                {log.length === 0 ? (
                  <p className="text-sm text-white/30">尚無對話。對著鏡頭說出你的第一句話吧。</p>
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
              <div
                className={`mb-4 flex items-center justify-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  connecting
                    ? "border-blue-400/25 bg-blue-400/[0.07] text-blue-200"
                    : agentTalking
                      ? "border-violet-400/25 bg-violet-400/[0.07] text-violet-200"
                      : responding
                        ? "border-amber-400/25 bg-amber-400/[0.07] text-amber-100/90"
                        : "border-[#06C755]/25 bg-[#06C755]/[0.07] text-[#06C755]"
                }`}
              >
                {connecting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> 正在連上 {currentAgent.personEn}…
                  </>
                ) : agentTalking ? (
                  <>
                    <Volume2 size={14} className="text-violet-300" />
                    <span className="text-violet-200">{currentAgent.personEn} 語音回覆中</span>
                  </>
                ) : responding ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> {currentAgent.personEn} 正在思考…
                  </>
                ) : (
                  <>
                    <span className="tv-breathe h-2 w-2 rounded-full bg-[#06C755]" />
                    {isSpeakingUI
                      ? `正在對 ${currentAgent.personEn} 說話…`
                      : `現在與 ${currentAgent.personEn} ${currentAgent.personZh} 即時對談 · 揮手或叫名字換人`}
                  </>
                )}
              </div>
              <div className="flex items-end gap-3 overflow-x-auto pb-2">
                {roster.map((a, i) => {
                  const isCurrent = i === currentIndex;
                  const text = isCurrent ? displayText : "";
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
                      <div className="mb-2 flex h-24 w-full items-end justify-center">
                        {isCurrent && (connecting || responding) ? (
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
                        <LiveAvatar
                          personEn={a.personEn}
                          color={a.color}
                          size={isCurrent ? 76 : 50}
                          slug={a.slug}
                          talking={isCurrent && agentTalking}
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#05060a] ${
                            isCurrent
                              ? connecting || responding
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
                ，逐字稿與 {log.length} 則對話已保存。
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
                    setResultPanel(null);
                    setCurrentIndex(0);
                    setSavedInfo(null);
                    setMeetingId(null);
                    meetingIdRef.current = null;
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

/* ── Agent 呼叫 show_result 推上畫面的內容：表格／圖表／數字卡／文字／結論 ── */
function ResultPanelView({ result, onClose }: { result: SharedResult; onClose: () => void }) {
  const agentMeta = AGENTS.find((a) => a.slug === result.agentSlug);
  const icon =
    result.kind === "table" ? (
      <Table2 size={13} />
    ) : result.kind === "chart" ? (
      <BarChart3 size={13} />
    ) : result.kind === "conclusion" ? (
      <Quote size={13} />
    ) : (
      <Sparkles size={13} />
    );

  return (
    <div
      className="tv-pop relative overflow-hidden rounded-2xl border p-5"
      style={{ borderColor: `${result.color}55`, background: `linear-gradient(135deg, ${result.color}12, rgba(255,255,255,0.02))` }}
    >
      <button
        type="button"
        onClick={onClose}
        title="關閉"
        className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={13} />
      </button>
      <p
        className="mb-3 flex items-center gap-1.5 pr-8 text-[11px] font-semibold tracking-[0.15em]"
        style={{ color: result.color }}
      >
        {icon} {agentMeta ? `${agentMeta.personEn} 的畫面分享` : "畫面分享"}
      </p>
      <p className="mb-3 text-base font-medium text-white">{result.title}</p>

      {result.kind === "table" && result.table && (
        <div className="overflow-x-auto rounded-lg border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.05] text-white/45">
                {result.table.columns.map((c) => (
                  <th key={c} className="px-3 py-1.5 text-left text-xs font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.table.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? "bg-white/[0.02]" : undefined}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-white/80">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.kind === "chart" && result.chart && result.chart.length > 0 && (
        <div className="space-y-2.5">
          {(() => {
            const max = Math.max(1, ...result.chart.map((d) => d.value));
            return result.chart.map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-white/70">{d.label}</span>
                  <span className="font-mono text-white/50">{d.value.toLocaleString("en-US")}</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(d.value / max) * 100}%`, background: result.color }}
                  />
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {result.kind === "metrics" && result.metrics && (
        <div className="grid grid-cols-3 gap-2.5">
          {result.metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-center">
              <p className="font-mono text-lg font-light text-white">{m.value}</p>
              <p className="mt-0.5 text-[11px] text-white/40">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {(result.kind === "text" || result.kind === "conclusion") && (
        <p
          className={`text-sm leading-relaxed ${
            result.kind === "conclusion" ? "border-l-2 pl-3 italic text-white/85" : "text-white/80"
          }`}
          style={result.kind === "conclusion" ? { borderColor: result.color } : undefined}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
