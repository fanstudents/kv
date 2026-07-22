"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Send, SlidersHorizontal, Square, X } from "lucide-react";
import { AGENTS } from "@/lib/agent-data";
import Avatar from "@/components/agents/Avatar";
import type { AgentMeta } from "@/lib/types";

// 劇院模式指揮台:一個大輸入框,老闆打字 @ 或直接開口說話,同時對多位 Agent 下指令。
// 沿用 AgentChatWidget 的 @ 提及解析,但允許「一句話同時點好幾位名」,各自平行回覆、
// 各自的回覆互不等待。訊息只存在瀏覽器記憶體,跟 AgentChatWidget 一樣是輕量問答。

interface ConsoleEntry {
  id: string;
  kind: "command" | "reply" | "error";
  agentSlug?: string;
  text: string;
  pending?: boolean;
}

let idSeq = 0;
function nextId() {
  idSeq += 1;
  return `c${idSeq}`;
}

// 抓出一句話裡「所有」完整的 @英文名 提及(可能同時點好幾位名),依出現順序去重。
function findMentionedAgents(text: string): AgentMeta[] {
  const names = Array.from(text.matchAll(/@([\p{L}\p{N}_]+)/gu)).map((m) => m[1].toLowerCase());
  const seen = new Set<string>();
  const result: AgentMeta[] = [];
  for (const name of names) {
    const agent = AGENTS.find((a) => a.personEn.toLowerCase() === name);
    if (agent && !seen.has(agent.slug)) {
      seen.add(agent.slug);
      result.push(agent);
    }
  }
  return result;
}

// 輸入中的 @ 提及:抓最近一個「行首或空白後的 @字串」到游標為止,驅動即時自動完成清單。
function getMentionQuery(text: string, caret: number): { query: string; start: number } | null {
  const upto = text.slice(0, caret);
  const match = upto.match(/(?:^|\s)@([\p{L}\p{N}_]*)$/u);
  if (!match) return null;
  return { query: match[1], start: caret - match[1].length - 1 };
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

export default function CommandConsole({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [text, setText] = useState("");
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hint, setHint] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, open]);

  // 關閉指揮台時順手停掉還在錄的音,避免麥克風燈一直亮著
  useEffect(() => {
    if (!open) {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }
  }, [open]);

  const suggestions = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return AGENTS.filter(
      (a) =>
        a.personEn.toLowerCase().includes(q) ||
        a.personZh.includes(mention.query) ||
        a.role.includes(mention.query)
    ).slice(0, 6);
  }, [mention]);

  const nameOf = (slug?: string) => {
    const a = AGENTS.find((x) => x.slug === slug);
    return a ? `${a.personEn} ${a.personZh}` : "Agent";
  };

  const insertMention = (agent: AgentMeta, replaceMention: { query: string; start: number } | null) => {
    const el = textareaRef.current;
    if (replaceMention) {
      const caret = el?.selectionStart ?? text.length;
      const next = text.slice(0, replaceMention.start) + `@${agent.personEn} ` + text.slice(caret);
      setText(next);
      const pos = replaceMention.start + agent.personEn.length + 2;
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(pos, pos);
      });
    } else {
      // 點頭像點名:已經點過名的人就不重複插入
      if (new RegExp(`@${agent.personEn}\\b`, "i").test(text)) {
        el?.focus();
        return;
      }
      const sep = text && !text.endsWith(" ") ? " " : "";
      setText(`${text}${sep}@${agent.personEn} `);
      requestAnimationFrame(() => el?.focus());
    }
    setMention(null);
    setHint("");
  };

  const handleChange = (value: string, caret: number) => {
    setText(value);
    setHint("");
    setMention(getMentionQuery(value, caret));
    setActiveIndex(0);
  };

  const send = (raw0?: string) => {
    const raw = (raw0 ?? text).trim();
    if (!raw) return;
    const agents = findMentionedAgents(raw);
    if (agents.length === 0) {
      setHint("先 @ 一位或多位 Agent,或點下面的頭像點名～");
      return;
    }

    const recentHistory = entries
      .filter((e) => !e.pending && e.kind !== "error")
      .slice(-10)
      .map((e) => (e.kind === "command" ? `老闆: ${e.text}` : `${nameOf(e.agentSlug)}: ${e.text}`))
      .join("\n");

    setEntries((prev) => [...prev, { id: nextId(), kind: "command", text: raw }]);
    setText("");
    setMention(null);
    setHint("");

    agents.forEach((agent) => {
      const pendingId = nextId();
      setEntries((prev) => [
        ...prev,
        { id: pendingId, kind: "reply", agentSlug: agent.slug, text: "", pending: true },
      ]);
      fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentSlug: agent.slug, message: raw, history: recentHistory }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.reply) throw new Error(data.error || "沒有收到回覆");
          setEntries((prev) =>
            prev.map((e) => (e.id === pendingId ? { ...e, text: data.reply as string, pending: false } : e))
          );
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : "連線失敗,稍後再試一次";
          setEntries((prev) =>
            prev.map((e) => (e.id === pendingId ? { ...e, kind: "error", text: msg, pending: false } : e))
          );
        });
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(suggestions[activeIndex], mention);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const startRecording = async () => {
    setHint("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickAudioMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        if (blob.size < 500) return; // 太短,大概沒錄到東西
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, `command.${audioExt(mime)}`);
          const res = await fetch("/api/meeting/transcribe", { method: "POST", body: form });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.text) throw new Error(data.error || "沒聽清楚,再說一次？");
          const spoken = String(data.text).trim();
          if (spoken) send(spoken);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "語音辨識失敗";
          setHint(msg);
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setHint("拿不到麥克風權限,請檢查瀏覽器設定");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        title={open ? "關閉指揮台" : "指揮台:@ 或開口,同時對多位 Agent 下指令"}
        className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition-colors ${
          open
            ? "border-[#06C755]/50 bg-[#06C755]/15 text-[#06C755]"
            : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
        }`}
      >
        <SlidersHorizontal size={15} />
      </button>

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-11 sm:px-8">
          <div className="tv-pop flex w-full max-w-[860px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12]/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="tv-breathe h-1.5 w-1.5 rounded-full bg-[#06C755]" />
                  指揮台
                </p>
                <p className="text-[11px] text-white/40">打字 @ 或按麥克風開口,一次對多位隊友下指令</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="關閉"
              >
                <X size={16} />
              </button>
            </div>

            {entries.length > 0 && (
              <div ref={scrollRef} className="max-h-[38vh] space-y-3 overflow-y-auto px-5 py-3">
                {entries.map((e) => {
                  if (e.kind === "command") {
                    return (
                      <div key={e.id} className="flex justify-end">
                        <div className="max-w-[85%] break-words rounded-2xl rounded-br-sm bg-[#06C755] px-3.5 py-2 text-sm text-black">
                          {e.text}
                        </div>
                      </div>
                    );
                  }
                  const agent = AGENTS.find((a) => a.slug === e.agentSlug);
                  return (
                    <div key={e.id} className="flex items-start gap-2.5">
                      {agent && <Avatar personEn={agent.personEn} color={agent.color} size={26} />}
                      <div className="min-w-0 flex-1">
                        {agent && (
                          <p className="mb-0.5 text-[11px] font-medium" style={{ color: agent.color }}>
                            {agent.personEn} {agent.personZh}
                          </p>
                        )}
                        <div
                          className={`max-w-full break-words rounded-2xl rounded-tl-sm px-3.5 py-2 text-sm ${
                            e.kind === "error" ? "bg-red-500/10 text-red-300" : "bg-white/[0.06] text-white/90"
                          }`}
                        >
                          {e.pending ? (
                            <span className="flex items-center gap-1 py-0.5">
                              {[0, 1, 2].map((i) => (
                                <i
                                  key={i}
                                  className="h-1.5 w-1.5 rounded-full bg-current opacity-60"
                                  style={{
                                    animation: "office-typing 1.2s ease-in-out infinite",
                                    animationDelay: `${i * 160}ms`,
                                  }}
                                />
                              ))}
                            </span>
                          ) : (
                            e.text
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 快速點名:點頭像插入 @Name,免打字也能同時點好幾位 */}
            <div className="flex gap-1.5 overflow-x-auto px-5 pb-1 pt-3">
              {AGENTS.map((a) => (
                <button
                  key={a.slug}
                  type="button"
                  onClick={() => insertMention(a, null)}
                  title={`點名 @${a.personEn}`}
                  className="shrink-0 rounded-full opacity-70 ring-offset-2 ring-offset-[#0b0d12] transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2"
                  style={{ ["--tw-ring-color" as string]: a.color }}
                >
                  <Avatar personEn={a.personEn} color={a.color} size={30} />
                </button>
              ))}
            </div>

            <div className="relative px-5 pb-5 pt-2">
              {mention && suggestions.length > 0 && (
                <div className="absolute bottom-full left-5 right-5 mb-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#14161c] py-1 shadow-2xl">
                  {suggestions.map((a, i) => (
                    <button
                      key={a.slug}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMention(a, mention);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                        i === activeIndex ? "bg-white/10" : ""
                      }`}
                    >
                      <Avatar personEn={a.personEn} color={a.color} size={22} />
                      <span className="min-w-0 flex-1 truncate text-white/90">
                        <span className="font-medium">
                          {a.personEn} {a.personZh}
                        </span>
                        <span className="ml-1.5 text-xs text-white/40">{a.role}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {hint && <p className="mb-1.5 text-xs text-amber-300">{hint}</p>}
              {transcribing && <p className="mb-1.5 text-xs text-white/40">辨識語音中…</p>}
              <div className="flex items-end gap-2.5">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => handleChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                  onKeyDown={onKeyDown}
                  onClick={(ev) => {
                    const el = ev.target as HTMLTextAreaElement;
                    handleChange(text, el.selectionStart ?? text.length);
                  }}
                  rows={2}
                  placeholder="@Milo 明天行程排一下、@Ivy 準備週報…"
                  className="max-h-32 min-h-[3.2rem] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[#06C755]/60"
                />
                <button
                  type="button"
                  onClick={() => (recording ? stopRecording() : startRecording())}
                  disabled={transcribing}
                  title={recording ? "停止錄音" : "按一下開口說話"}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                    recording
                      ? "tv-breathe bg-red-500 text-white"
                      : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {recording ? <Square size={15} /> : <Mic size={17} />}
                </button>
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={!text.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#06C755] text-black transition-opacity hover:opacity-90 disabled:opacity-40"
                  aria-label="送出"
                >
                  <Send size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
