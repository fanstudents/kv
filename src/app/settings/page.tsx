"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { Field, TextInput } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";

export default function SettingsPage() {
  const [channelId, setChannelId] = useState("2007xxxxx01");
  const [channelSecret, setChannelSecret] = useState("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6");
  const [accessToken, setAccessToken] = useState(
    "gK7q9X2z...（示範用，實際部署時請改為環境變數）"
  );
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = "https://your-domain.example.com/api/line/webhook";

  const copyWebhook = () => {
    navigator.clipboard?.writeText(webhookUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <PageHeader
        title="LINE OA 連線設定"
        description="設定官方帳號的 Channel 憑證與 Webhook，以便讓 5 個 Agent 透過此帳號推播訊息"
        actions={<Badge tone="warning">尚未部署，此頁面目前為介面示範</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Messaging API 憑證</h2>
          <div className="space-y-4">
            <Field label="Channel ID">
              <TextInput value={channelId} onChange={(e) => setChannelId(e.target.value)} />
            </Field>

            <Field label="Channel Secret">
              <div className="relative">
                <TextInput
                  type={showSecret ? "text" : "password"}
                  value={channelSecret}
                  onChange={(e) => setChannelSecret(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-neutral-600"
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="Channel Access Token" hint="正式部署時建議存放於伺服器環境變數，勿寫入前端程式碼">
              <div className="relative">
                <TextInput
                  type={showToken ? "text" : "password"}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((s) => !s)}
                  className="absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-neutral-600"
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="Webhook URL" hint="部署後將此網址貼到 LINE Developers 後台的 Webhook 設定">
              <div className="flex gap-2">
                <TextInput readOnly value={webhookUrl} className="bg-neutral-50 dark:bg-neutral-900" />
                <button
                  type="button"
                  onClick={copyWebhook}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {copied ? <CheckCircle2 size={14} className="text-[#06C755]" /> : <Copy size={14} />}
                  {copied ? "已複製" : "複製"}
                </button>
              </div>
            </Field>

            <button
              type="button"
              className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              儲存設定
            </button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">部署狀態</h2>
          <ul className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
            <li className="flex items-center justify-between">
              <span>前端介面</span>
              <Badge tone="success">已完成</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>LINE Messaging API 串接</span>
              <Badge tone="neutral">待部署</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>Agent 執行後端</span>
              <Badge tone="neutral">待部署</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span>資料儲存 / 資料庫</span>
              <Badge tone="neutral">待部署</Badge>
            </li>
          </ul>
          <p className="mt-4 text-xs text-neutral-400">
            目前僅提供介面操作示範，尚未串接真實 LINE 帳號或後端服務。確認畫面與流程後，可以進行後端與正式部署。
          </p>
        </Card>
      </div>
    </div>
  );
}
