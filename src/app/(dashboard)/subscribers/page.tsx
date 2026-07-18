"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Send, Tag, Users, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import PhoneFrame from "@/components/agents/PhoneFrame";
import {
  LineTextMessage,
  LineFlexMessage,
  LineConfirmMessage,
  LineButtonsMessage,
} from "@/components/agents/LineMessages";
import { PUSH_STYLES, type PushStyle } from "@/lib/line-message-styles";

interface Subscriber {
  id: string;
  line_user_id: string;
  channel: "primary" | "support";
  display_name: string | null;
  picture_url: string | null;
  tags: string[];
  note: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

interface BroadcastLog {
  id: string;
  tag_filter: string | null;
  channel_filter: string | null;
  message_style: string;
  message_text: string;
  recipient_count: number;
  success_count: number;
  failed_count: number;
  created_at: string;
}

const CHANNEL_LABEL: Record<string, string> = { primary: "主控台帳號", support: "客服帳號" };

function TagEditor({ subscriber, onChange }: { subscriber: Subscriber; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const v = input.trim();
    if (!v || subscriber.tags.includes(v)) return;
    onChange([...subscriber.tags, v]);
    setInput("");
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {subscriber.tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-[#06C755]/10 px-2 py-0.5 text-xs font-medium text-[#06C755]"
          >
            {t}
            <button type="button" onClick={() => onChange(subscriber.tags.filter((x) => x !== t))}>
              <X size={11} />
            </button>
          </span>
        ))}
        {subscriber.tags.length === 0 && <span className="text-xs text-neutral-400">尚未加標籤</span>}
      </div>
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTag()}
          placeholder="輸入標籤按 Enter，例如「學員」「內部團隊」"
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#06C755] dark:border-neutral-700 dark:bg-neutral-950"
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          新增
        </button>
      </div>
    </div>
  );
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [channelFilter, setChannelFilter] = useState<"all" | "primary" | "support">("all");
  const [pushStyle, setPushStyle] = useState<PushStyle>("text");
  const [messageText, setMessageText] = useState("");
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sendMessage, setSendMessage] = useState("");

  const loadAll = () => {
    fetch("/api/subscribers")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setSubscribers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoaded(true));

    fetch("/api/subscribers/broadcast")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    loadAll();
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    subscribers.forEach((sub) => sub.tags.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [subscribers]);

  const matchingRecipients = useMemo(() => {
    return subscribers.filter((s) => {
      const tagOk = selectedTags.size === 0 || s.tags.some((t) => selectedTags.has(t));
      const channelOk = channelFilter === "all" || s.channel === channelFilter;
      return tagOk && channelOk;
    });
  }, [subscribers, selectedTags, channelFilter]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const updateTags = async (subscriber: Subscriber, tags: string[]) => {
    setSubscribers((prev) => prev.map((s) => (s.id === subscriber.id ? { ...s, tags } : s)));
    await fetch(`/api/subscribers/${subscriber.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    }).catch(() => {});
  };

  const handleBroadcast = async () => {
    if (!messageText.trim() || matchingRecipients.length === 0) return;
    setSendState("sending");
    setSendMessage("");
    try {
      const res = await fetch("/api/subscribers/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags: [...selectedTags],
          channel: channelFilter,
          style: pushStyle,
          text: messageText,
          title: "團隊公告",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "推播失敗");
      setSendState("sent");
      setSendMessage(`已送出給 ${data.successCount} 位（失敗 ${data.failedCount} 位）`);
      loadAll();
      setTimeout(() => setSendState("idle"), 4000);
    } catch (err) {
      setSendState("error");
      setSendMessage(err instanceof Error ? err.message : "推播失敗");
    }
  };

  return (
    <div>
      <PageHeader title="訂閱者管理" description="管理所有透過 LINE 傳訊息進來的使用者，貼標籤分組後可以針對特定族群發送推播" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-neutral-400">總訂閱者數</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {loaded ? subscribers.length : "…"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">已建立標籤數</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">{allTags.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">累計分組推播次數</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">{logs.length}</p>
        </Card>
      </div>

      <Card className="mb-6 overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
              <tr>
                <th className="w-8 px-4 py-3"></th>
                <th className="px-4 py-3 text-left font-medium">使用者</th>
                <th className="px-4 py-3 text-left font-medium">帳號</th>
                <th className="px-4 py-3 text-left font-medium">標籤</th>
                <th className="px-4 py-3 text-left font-medium">最後互動</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loaded && subscribers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                    <Users size={20} className="mx-auto mb-2" />
                    還沒有人傳訊息進來，等有人跟 LINE 官方帳號互動後就會出現在這裡
                  </td>
                </tr>
              )}
              {subscribers.map((s) => {
                const isOpen = expanded.has(s.id);
                return (
                  <Fragment key={s.id}>
                    <tr
                      onClick={() => toggleExpanded(s.id)}
                      className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-950/50"
                    >
                      <td className="px-4 py-3 text-neutral-400">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {s.picture_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.picture_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs text-neutral-500 dark:bg-neutral-800">
                              ?
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-neutral-800 dark:text-neutral-100">
                              {s.display_name || "（未取得暱稱）"}
                            </p>
                            <p className="font-mono text-[10px] text-neutral-400">{s.line_user_id.slice(0, 14)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={s.channel === "support" ? "warning" : "neutral"}>{CHANNEL_LABEL[s.channel]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {s.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.tags.map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-[#06C755]/10 px-2 py-0.5 text-xs font-medium text-[#06C755]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-400">
                        {new Date(s.last_seen_at).toLocaleString("zh-TW")}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-neutral-50/60 dark:bg-neutral-950/40">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <p className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">編輯標籤</p>
                              <TagEditor subscriber={s} onChange={(tags) => updateTags(s, tags)} />
                            </div>
                            <div className="space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                              <p>完整 LINE User ID：<span className="font-mono text-neutral-700 dark:text-neutral-300">{s.line_user_id}</span></p>
                              <p>首次互動：{new Date(s.first_seen_at).toLocaleString("zh-TW")}</p>
                              <p>來源帳號：{CHANNEL_LABEL[s.channel]}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">分組推播</h2>
        <p className="mt-1 text-xs text-neutral-400">挑選標籤與帳號篩選收件對象，選擇 LINE 訊息樣式後發送</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                <Tag size={13} /> 篩選標籤（不選代表全部）
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allTags.length === 0 && <span className="text-xs text-neutral-400">目前還沒有任何標籤，先在上面清單幫訂閱者加標籤</span>}
                {allTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTagFilter(t)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      selectedTags.has(t)
                        ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
                        : "border-neutral-300 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">帳號</p>
              <div className="flex gap-1.5">
                {(["all", "primary", "support"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChannelFilter(c)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      channelFilter === c
                        ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
                        : "border-neutral-300 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {c === "all" ? "全部" : CHANNEL_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">LINE 訊息樣式</p>
              <div className="flex flex-wrap gap-1.5">
                {PUSH_STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setPushStyle(s.value)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      pushStyle === s.value
                        ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
                        : "border-neutral-300 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">訊息內容</p>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                placeholder="輸入要推播的內容..."
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/20 dark:border-neutral-700 dark:bg-neutral-950"
              />
            </div>

            <button
              type="button"
              onClick={handleBroadcast}
              disabled={sendState === "sending" || !messageText.trim() || matchingRecipients.length === 0}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#06C755] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {sendState === "sending" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {sendState === "sending" ? "發送中…" : `發送給 ${matchingRecipients.length} 位訂閱者`}
            </button>
            {sendMessage && (
              <p className={`text-xs ${sendState === "error" ? "text-red-500" : "text-[#06C755]"}`}>{sendMessage}</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">預覽</p>
            <PhoneFrame accountName="團隊公告">
              {pushStyle === "text" && (
                <LineTextMessage text={messageText || "（尚未輸入內容）"} timestamp="剛剛" />
              )}
              {pushStyle === "flex" && (
                <LineFlexMessage title="團隊公告" text={messageText || "（尚未輸入內容）"} timestamp="剛剛" />
              )}
              {pushStyle === "confirm" && (
                <LineConfirmMessage text={messageText || "（尚未輸入內容）"} timestamp="剛剛" />
              )}
              {pushStyle === "buttons" && (
                <LineButtonsMessage
                  title="團隊公告"
                  text={messageText || "（尚未輸入內容）"}
                  actions={["查看詳情", "稍後提醒我", "暫停通知"]}
                  timestamp="剛剛"
                />
              )}
            </PhoneFrame>
          </div>
        </div>
      </Card>

      {logs.length > 0 && (
        <>
          <div className="mt-8 mb-4">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">推播歷史</h2>
          </div>
          <Card className="overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">內容</th>
                    <th className="px-4 py-3 text-left font-medium">篩選條件</th>
                    <th className="px-4 py-3 text-right font-medium">送達</th>
                    <th className="px-4 py-3 text-left font-medium">時間</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="max-w-xs px-4 py-3 text-neutral-600 dark:text-neutral-300">
                        <span className="line-clamp-1">{log.message_text}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400">
                        {log.tag_filter ? `標籤：${log.tag_filter}` : "全部訂閱者"}
                        {log.channel_filter ? ` · ${CHANNEL_LABEL[log.channel_filter]}` : ""}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                        {log.success_count}/{log.recipient_count}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-400">
                        {new Date(log.created_at).toLocaleString("zh-TW")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
