"use client";

import { useEffect, useState } from "react";
import { Send, Save, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Toggle from "@/components/ui/Toggle";
import ActivityLog from "@/components/agents/ActivityLog";
import Avatar from "@/components/agents/Avatar";
import VisitFlowSteps from "@/components/agents/VisitFlowSteps";
import { deriveFlowSteps } from "@/lib/agent-flows";
import type { AgentMeta, AgentActivity } from "@/lib/types";

const TEST_USER_ID_KEY = "line-agent-console:test-user-id";

export default function AgentPageShell({
  agent,
  settings,
  previewText,
  fallbackActivity,
  settingsForm,
  preview,
  previewTitle = "LINE 推播預覽",
  testPushLabel = "傳送測試訊息",
  onSettingsLoaded,
}: {
  agent: AgentMeta;
  settings: Record<string, unknown>;
  previewText: string;
  fallbackActivity: AgentActivity[];
  settingsForm: React.ReactNode;
  preview: React.ReactNode;
  previewTitle?: string;
  testPushLabel?: string;
  onSettingsLoaded?: (settings: Record<string, unknown>) => void;
}) {
  const [enabled, setEnabled] = useState(agent.status === "active");
  const [activity, setActivity] = useState<AgentActivity[]>(fallbackActivity);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testUserId, setTestUserId] = useState("");
  const [testState, setTestState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [testError, setTestError] = useState("");

  useEffect(() => {
    setTestUserId(localStorage.getItem(TEST_USER_ID_KEY) ?? "");

    fetch(`/api/agents/${agent.slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setEnabled(Boolean(data.enabled));
          if (data.settings) onSettingsLoaded?.(data.settings);
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
        body: JSON.stringify({ settings }),
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
        body: JSON.stringify({ to: testUserId, text: previewText }),
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Agent 設定 {!loaded && <span className="ml-2 text-xs font-normal text-neutral-400">載入中…</span>}
            </h2>
            <fieldset disabled={!enabled} className={enabled ? "" : "opacity-50"}>
              {settingsForm}
            </fieldset>
          </Card>

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
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">{previewTitle}</h2>
            {preview}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">測試推播</h2>
            <p className="mb-2 text-xs text-neutral-400">
              先將官方帳號加為好友並傳一則訊息，即可在 Webhook 收到您的 LINE User ID（可在伺服器 log 查看），貼在下方即可對自己測試推播。
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
          </Card>
        </div>
      </div>
    </div>
  );
}
