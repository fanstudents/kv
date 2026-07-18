"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { getAgent } from "@/lib/agent-data";

interface Sum {
  count: number;
  tokens: number;
  cost: number;
}
interface OperationRow extends Sum {
  operation: string;
  model: string;
}
interface ModelRow extends Sum {
  model: string;
}
interface RecentRow {
  id: string;
  agent_slug: string | null;
  operation: string;
  model: string;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
}
interface UsageData {
  total: Sum;
  last30: Sum;
  last7: Sum;
  operations: OperationRow[];
  models: ModelRow[];
  recent: RecentRow[];
}

const USD_TO_TWD = 32; // 概略匯率，僅供參考

function usd(n: number) {
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}
function twd(n: number) {
  return `約 NT$${(n * USD_TO_TWD).toFixed(n * USD_TO_TWD < 10 ? 1 : 0)}`;
}
function num(n: number) {
  return n.toLocaleString("en-US");
}

export default function AiUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/ai-usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const empty = loaded && (!data || data.total.count === 0);

  return (
    <div>
      <PageHeader
        title="AI 使用成本"
        description="統計這套系統所有 AI 呼叫的次數、Token 用量與估算費用（依 OpenAI 定價換算，僅供參考）"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-neutral-400">累計費用</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {data ? usd(data.total.cost) : loaded ? "$0" : "…"}
          </p>
          {data && <p className="mt-0.5 text-xs text-neutral-400">{twd(data.total.cost)}</p>}
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">近 30 天費用</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {data ? usd(data.last30.cost) : loaded ? "$0" : "…"}
          </p>
          {data && (
            <p className="mt-0.5 text-xs text-neutral-400">
              {num(data.last30.count)} 次 · {num(data.last30.tokens)} tokens
            </p>
          )}
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">近 7 天費用</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {data ? usd(data.last7.cost) : loaded ? "$0" : "…"}
          </p>
          {data && (
            <p className="mt-0.5 text-xs text-neutral-400">
              {num(data.last7.count)} 次 · {num(data.last7.tokens)} tokens
            </p>
          )}
        </Card>
      </div>

      {empty && (
        <Card>
          <p className="py-8 text-center text-sm text-neutral-400">
            目前還沒有 AI 呼叫紀錄。當名片辨識、邀約信撰寫、每日晨報摘要等功能實際執行後，就會在這裡累積成本資料。
          </p>
        </Card>
      )}

      {data && data.total.count > 0 && (
        <>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">依功能項目</h2>
          </div>
          <Card className="mb-6 overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">功能</th>
                    <th className="px-4 py-3 text-left font-medium">負責 Agent</th>
                    <th className="px-4 py-3 text-left font-medium">模型</th>
                    <th className="px-4 py-3 text-right font-medium">次數</th>
                    <th className="px-4 py-3 text-right font-medium">Token</th>
                    <th className="px-4 py-3 text-right font-medium">費用</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {data.operations.map((op) => (
                    <tr key={op.operation}>
                      <td className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-100">{op.operation}</td>
                      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{agentLabel(op)}</td>
                      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{op.model}</td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">{num(op.count)}</td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">{num(op.tokens)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-neutral-800 dark:text-neutral-100">
                        {usd(op.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">依模型</h2>
          </div>
          <Card className="mb-6 overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">模型</th>
                    <th className="px-4 py-3 text-right font-medium">次數</th>
                    <th className="px-4 py-3 text-right font-medium">Token</th>
                    <th className="px-4 py-3 text-right font-medium">費用</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {data.models.map((m) => (
                    <tr key={m.model}>
                      <td className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-100">{m.model}</td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">{num(m.count)}</td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">{num(m.tokens)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-neutral-800 dark:text-neutral-100">
                        {usd(m.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">最近呼叫紀錄</h2>
          </div>
          <Card className="overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">功能</th>
                    <th className="px-4 py-3 text-left font-medium">模型</th>
                    <th className="px-4 py-3 text-right font-medium">Token</th>
                    <th className="px-4 py-3 text-right font-medium">費用</th>
                    <th className="px-4 py-3 text-left font-medium">時間</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {data.recent.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{r.operation}</td>
                      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{r.model}</td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                        {num(r.total_tokens)}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                        {usd(Number(r.cost_usd))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-400">
                        {new Date(r.created_at).toLocaleString("zh-TW")}
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

function agentLabel(op: OperationRow): string {
  // 依操作名稱推測負責的 Agent（顯示用）
  const map: Record<string, string> = {
    名片辨識: "visit",
    邀約信撰寫: "visit",
    每日晨報摘要: "teamlead",
  };
  const slug = map[op.operation];
  const agent = slug ? getAgent(slug) : undefined;
  return agent ? `${agent.personZh}（${agent.name}）` : "—";
}
