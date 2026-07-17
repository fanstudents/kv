"use client";

import { useEffect, useState } from "react";
import { Send, Save, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Toggle from "@/components/ui/Toggle";
import ActivityLog from "@/components/agents/ActivityLog";
import Avatar from "@/components/agents/Avatar";
import VisitFlowSteps from "@/components/agents/VisitFlowSteps";
import PhoneFrame from "@/components/agents/PhoneFrame";
import {
  LineTextMessage,
  LineFlexMessage,
  LineConfirmMessage,
  LineButtonsMessage,
} from "@/components/agents/LineMessages";
import { deriveFlowSteps } from "@/lib/agent-flows";
import { PUSH_STYLES, type PushStyle } from "@/lib/line-message-styles";
import type { AgentMeta, AgentActivity } from "@/lib/types";

const TEST_USER_ID_KEY = "line-agent-console:test-user-id";
const DEFAULT_TEST_USER_ID = "U00cbec1389dcf7d4c8802fafc2cc9951";

export default function AgentPageShell({
  agent,
  settings,
  previewText,
  fallbackActivity,
  settingsForm,
  preview,
  previewTitle = "情境預覽",
  testPushLabel = "傳送測試訊息",
  onSettingsLoaded,
}: {
  agent: AgentMeta;
  settings: Record<string, unknown>;
  previewText: string;
  fallbackActivity: AgentActivity[];
  settingsForm: React.ReactNode;
  preview?: React.ReactNode;
  previewTitle?: string;
  testPushLabel?: string;
  onSettingsLoaded?: (settings: Record<string, unknown>) => void;
}) {
  const [enabled, setEnabled] = useState(agent.status === "active");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pushStyle, setPushStyle] = useState<PushStyle>("text");
  const [activity, setActivity] = useState<AgentActivity[]>(fallbackActivity);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testUserId, setTestUserId] = useState("");
  const [testState, setTestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [testError, setTestError] = useState("");

  useEffect(() => {
    setTestUserId(localStorage.getItem(TEST_USER_ID_KEY) ?? DEFAULT_TEST_USER_ID);

    fetch(`/api/agents/${agent.slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setEnabled(Boolean(data.enabled));
          if (data.settings) {
            if (["text", "flex", "confirm", "buttons"].includes(data.settings.pushStyle)) {
              setPushStyle(data.settings.pushStyle);
            }
            onSettingsLoaded?.(data.settings);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));

    fetch(`/api/agents/${agent.slug}/activity`)
      .then((res) => (res.ok ? res.json() : null))
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setActivity(
            rows.map((r) => ({
              id: r.id,
              timestamp: new Date(r.occurred_at).toLocaleString("zh-TW"),
              summary: r.summary,
              status: r.status,
            }))
          );
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.slug]);

  // 最近一次「真正的執行」——排除草稿狀態的種子紀錄，避免誤導流程圖
  const latestRun = activity.find((a) => !a.summary.includes("草稿狀態") && a.timestamp !== "尚未啟用");

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    await fetch(`/api/agents/${agent.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    }).catch(() => {});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/agents/${agent.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { ...settings, pushStyle } }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestPush = async () => {
    localStorage.setItem(TEST_USER_ID_KEY, testUserId);
    setTestState("sending");
    setTestError("");
    try {
      const res = await fetch(`/api/agents/${agent.slug}/test-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testUserId,
          text: previewText,
          style: pushStyle,
          title: agent.name,
          accentColor: agent.color,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "推播失敗");
      setTestState("sent");
      fetch(`/api/agents/${agent.slug}/activity`)
        .then((r) => (r.ok ? r.json() : null))
        .then((rows) => {
          if (Array.isArray(rows)) {
            setActivity(
              rows.map((r) => ({
                id: r.id,
                timestamp: new Date(r.occurred_at).toLocaleString("zh-TW"),
                summary: r.summary,
                status: r.status,
              }))
            );
          }
        })
        .catch(() => {});
      setTimeout(() => setTestState("idle"), 2500);
    } catch (err) {
      setTestState("error");
      setTestError(err instanceof Error ? err.message : "推播失敗");
    }
  };

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar personEn={agent.personEn} color={agent.color} size={40} />
            <span>
              <span className="block">
                {agent.personEn} {agent.personZh}
                <span className="ml-2 text-sm font-normal text-neutral-400">
                  {agent.role} · {agent.name}
                </span>
              </span>
            </span>
          </span>
        }
        description={agent.description}
        actions={
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saved ? "已儲存" : "儲存設定"}
            </button>
            <Toggle checked={enabled} onChange={handleToggle} label={enabled ? "已啟用" : "已停用"} />
          </>
        }
      />

      <div className="space-y-6">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">任務流程節點</h2>
          <p className="mb-4 text-xs text-neutral-400">
            {latestRun
              ? `依最近一次執行（${latestRun.timestamp}）顯示各節點狀態`
              : "尚無執行紀錄，Agent 待命中"}
          </p>
          <VisitFlowSteps steps={deriveFlowSteps(agent.slug, latestRun)} />
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">執行紀錄</h2>
          <ActivityLog items={activity} />
        </Card>

        {preview && (
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">{previewTitle}</h2>
            {preview}
          </Card>
        )}

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">LINE 推播樣式與預覽</h2>
          <p className="mb-4 text-xs text-neutral-400">
            選擇這位 Agent 推播時使用的 LINE 訊息樣式，下方即為實際在 LINE 中呈現的樣子（記得按「儲存設定」保存樣式）
          </p>

          <div className="mb-5 flex flex-wrap gap-2">
            {PUSH_STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setPushStyle(s.value)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  pushStyle === s.value
                    ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
                    : "border-neutral-300 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
                title={s.hint}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <PhoneFrame accountName={agent.name}>
              {pushStyle === "text" && (
                <LineTextMessage
                  text={previewText}
                  caption={`${agent.name} 推播`}
                  timestamp="剛剛"
                  accentColor={agent.color}
                />
              )}
              {pushStyle === "flex" && (
                <LineFlexMessage
                  title={agent.name}
                  text={previewText}
                  accentColor={agent.color}
                  caption={`${agent.name} 推播`}
                  timestamp="剛剛"
                />
              )}
              {pushStyle === "confirm" && (
                <LineConfirmMessage
                  text={previewText.length > 240 ? `${previewText.slice(0, 239)}…` : previewText}
                  caption={`${agent.name} 推播`}
                  timestamp="剛剛"
                />
              )}
              {pushStyle === "buttons" && (
                <LineButtonsMessage
                  title={agent.name}
                  text={previewText.length > 60 ? `${previewText.slice(0, 59)}…` : previewText}
                  actions={["查看詳情", "稍後提醒我", "暫停通知"]}
                  caption={`${agent.name} 推播`}
                  timestamp="剛剛"
                />
              )}
            </PhoneFrame>

            <div>
              <h3 className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">測試推播</h3>
              <p className="mb-2 text-xs text-neutral-400">
                先將官方帳號加為好友並傳一則訊息，即可在 Webhook 收到您的 LINE User
                ID（可在伺服器 log 查看），貼在下方即可用左邊選定的樣式對自己實際推播。
              </p>
              <input
                type="text"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="您的 LINE User ID（U 開頭）"
                className="mb-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/20 dark:border-neutral-700 dark:bg-neutral-950"
              />
              <button
                type="button"
                onClick={handleTestPush}
                disabled={testState === "sending" || !testUserId}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#06C755] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {testState === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {testState === "sent" ? "已送出！請查看 LINE" : testPushLabel}
              </button>
              {testState === "error" && <p className="mt-2 text-xs text-red-500">{testError}</p>}
            </div>
          </div>
        </Card>

        <Card>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Agent 設定 {!loaded && <span className="ml-2 text-xs font-normal text-neutral-400">載入中…</span>}
            </h2>
            <span className="flex items-center gap-1 text-xs font-medium text-neutral-400">
              {settingsOpen ? "收合" : "展開"}
              {settingsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </button>
          {settingsOpen && (
            <fieldset disabled={!enabled} className={`mt-4 ${enabled ? "" : "opacity-50"}`}>
              {settingsForm}
            </fieldset>
          )}
        </Card>
      </div>
    </div>
  );
}
