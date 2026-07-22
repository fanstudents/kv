"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { AGENTS } from "@/lib/agent-data";
import Avatar from "@/components/agents/Avatar";
import type { AgentMeta } from "@/lib/types";

// 全站浮動聊天視窗：@ 一位 Agent，像日常對話一樣問他近況。
// 訊息只存在瀏覽器記憶體（重新整理就清空）——這是輕量的即時問答，不是正式紀錄，
// 真正的任務歷程仍看各 Agent 頁面的執行紀錄／Supabase。

interface ChatMessage {
  id: string;
  role: "user" | "agent" | "error";
  agentSlug?: string;
  text: string;
  pending?: boolean;
}

let idSeq = 0;
function nextId() {
  idSeq += 1;
  return `m${idSeq}`;
}

// 送出前只認「完整英文名」的 @ 提及（例如 @Milo），避免「@他」「@客服」這種
// 模糊字串誤觸發到不對的人，也讓比對邏輯單純、不用猜。
function findMentionedAgent(text: string): AgentMeta | undefined {
  const match = text.match(/@([\p{L}\p{N}_]+)/u);
  if (!match) return undefined;
  const name = match[1].toLowerCase();
  return AGENTS.find((a) => a.personEn.toLowerCase() === name);
}

// 輸入中的 @ 提及：往前找最近一個「行首或空白後的 @字串」到游標為止，
// 用來即時顯示自動完成建議清單。
function getMentionQuery(text: string, caret: number): { query: string; start: number } | null {
  const upto = text.slice(0, caret);
  const match = upto.match(/(?:^|\s)@([\p{L}\p{N}_]*)$/u);
  if (!match) return null;
  const query = match[1];
  return { query, start: caret - query.length - 1 };
}

export default function AgentChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hint, setHint] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const nameOf = (slug?: string) => AGENTS.find((a) => a.slug === slug)?.personEn ?? "Agent";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const selectMention = (agent: AgentMeta) => {
    if (!mention || !textareaRef.current) return;
    const caret = textareaRef.current.selectionStart ?? text.length;
    const next = text.slice(0, mention.start) + `@${agent.personEn} ` + text.slice(caret);
    setText(next);
    setMention(null);
    const pos = mention.start + agent.personEn.length + 2;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  };

  const handleChange = (value: string, caret: number) => {
    setText(value);
    setHint("");
    setMention(getMentionQuery(value, caret));
    setActiveIndex(0);
  };

  const send = async () => {
    const raw = text.trim();
    if (!raw) return;
    const agent = findMentionedAgent(raw);
    if (!agent) {
      setHint("先 @ 一位 Agent，讓 TA 知道你在找誰～");
      return;
    }

    const recentHistory = messages
      .filter((m) => m.role !== "error" && !m.pending)
      .slice(-8)
      .map((m) => (m.role === "user" ? `老闆: ${m.text}` : `${nameOf(m.agentSlug)}: ${m.text}`))
      .join("\n");

    const userMsg: ChatMessage = { id: nextId(), role: "user", text: raw };
    const pendingId = nextId();
    setMessages((prev) => [...prev, userMsg, { id: pendingId, role: "agent", agentSlug: agent.slug, text: "", pending: true }]);
    setText("");
    setMention(null);

    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentSlug: agent.slug, message: raw, history: recentHistory }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reply) throw new Error(data.error || "沒有收到回覆");
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, text: data.reply as string, pending: false } : m))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "連線失敗，稍後再試一次";
      setMessages((prev) => (prev.map((m) => (m.id === pendingId ? { ...m, role: "error", text: msg, pending: false } : m))));
    }
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
        selectMention(suggestions[activeIndex]);
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#06C755] text-white shadow-lg shadow-[#06C755]/30 transition-transform hover:scale-105"
        aria-label={open ? "關閉聊天" : "跟 Agent 聊聊"}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[32rem] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">跟 Agent 聊聊</p>
              <p className="text-xs text-neutral-400">@ 一位同事，問問他最近的狀況</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              aria-label="關閉"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs text-neutral-400">
                <MessageCircle size={28} className="text-neutral-300 dark:text-neutral-700" />
                <p>試試輸入「@Milo 明天行程還好嗎？」</p>
              </div>
            )}
            {messages.map((m) => {
              if (m.role === "user") {
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[80%] break-words rounded-2xl rounded-br-sm bg-[#06C755] px-3 py-2 text-sm text-white">
                      {m.text}
                    </div>
                  </div>
                );
              }
              const agent = AGENTS.find((a) => a.slug === m.agentSlug);
              const color = agent?.color ?? "#737373";
              return (
                <div key={m.id} className="flex items-start gap-2">
                  {agent && <Avatar personEn={agent.personEn} color={color} size={26} />}
                  <div className="min-w-0 flex-1">
                    {agent && (
                      <p className="mb-0.5 text-[11px] font-medium" style={{ color }}>
                        {agent.personEn} {agent.personZh}
                      </p>
                    )}
                    <div
                      className={`max-w-full break-words rounded-2xl rounded-tl-sm px-3 py-2 text-sm ${
                        m.role === "error"
                          ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
                          : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                      }`}
                    >
                      {m.pending ? (
                        <span className="flex items-center gap-1 py-0.5">
                          {[0, 1, 2].map((i) => (
                            <i
                              key={i}
                              className="h-1.5 w-1.5 rounded-full bg-current opacity-60"
                              style={{ animation: "office-typing 1.2s ease-in-out infinite", animationDelay: `${i * 160}ms` }}
                            />
                          ))}
                        </span>
                      ) : (
                        m.text
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative border-t border-neutral-200 p-3 dark:border-neutral-800">
            {mention && suggestions.length > 0 && (
              <div className="absolute bottom-full left-3 right-3 mb-2 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                {suggestions.map((a, i) => (
                  <button
                    key={a.slug}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectMention(a);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                      i === activeIndex ? "bg-neutral-100 dark:bg-neutral-700" : ""
                    }`}
                  >
                    <Avatar personEn={a.personEn} color={a.color} size={22} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-neutral-800 dark:text-neutral-100">
                        {a.personEn} {a.personZh}
                      </span>
                      <span className="ml-1.5 text-xs text-neutral-400">{a.role}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {hint && <p className="mb-1.5 text-xs text-amber-600 dark:text-amber-400">{hint}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => handleChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                onKeyDown={onKeyDown}
                onClick={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  handleChange(text, el.selectionStart ?? text.length);
                }}
                rows={1}
                placeholder="@Agent 問問他的近況…"
                className="max-h-24 flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#06C755] dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
              <button
                type="button"
                onClick={send}
                disabled={!text.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#06C755] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                aria-label="送出"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
