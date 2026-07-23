"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Card from "@/components/ui/Card";
import type { WeekOverview } from "@/lib/google";

const SCHEDULE_COLOR = "#8B5CF6"; // 跟 Milo(行程 Agent)頭像色一致
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function dayLabel(offset: number): { top: string; bottom: string } {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  if (offset === 0) return { top: "今天", bottom: `${d.getMonth() + 1}/${d.getDate()}` };
  if (offset === 1) return { top: "明天", bottom: `${d.getMonth() + 1}/${d.getDate()}` };
  return { top: `週${WEEKDAYS[d.getDay()]}`, bottom: `${d.getMonth() + 1}/${d.getDate()}` };
}

// 行程助理(Milo)用:真實 Google 行事曆——跟圖表型的 Agent 不同,這裡是行事曆形狀的呈現
// (未來七天的行程分布 + 接下來幾筆行程 + 衝突提醒),不是數字趨勢圖。
export default function ScheduleOverviewPanel() {
  const [data, setData] = useState<WeekOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/agents/schedule/week-overview")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.ok) setData(d.data as WeekOverview);
        else setError(d.error ?? "讀取失敗");
      })
      .catch(() => alive && setError("讀取失敗"));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <Card className="mb-6">
        <p className="text-sm text-amber-700 dark:text-amber-400">Google 行事曆真實資料讀取失敗:{error}</p>
      </Card>
    );
  }
  if (!data) {
    return <Card className="mb-6 h-64 animate-pulse" />;
  }

  const maxCount = Math.max(1, ...data.dayCounts);

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">本週行事曆總覽</h2>
        <span className="text-xs text-neutral-400">來源:Google 行事曆</span>
      </div>

      <div className="mb-5 grid grid-cols-7 gap-2">
        {data.dayCounts.map((count, i) => {
          const { top, bottom } = dayLabel(i);
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 py-3 dark:border-neutral-800"
            >
              <p className="text-[11px] text-neutral-400">{top}</p>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
                style={{
                  background: count > 0 ? `${SCHEDULE_COLOR}1f` : undefined,
                  color: count > 0 ? SCHEDULE_COLOR : undefined,
                }}
              >
                {count}
              </div>
              <p className="text-[10px] text-neutral-400">{bottom}</p>
              <div className="h-1 w-6 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(8, (count / maxCount) * 100)}%`, background: SCHEDULE_COLOR }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {data.warnings.length > 0 && (
        <div className="mb-5 space-y-1.5">
          {data.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      <p className="mb-2 text-xs font-medium text-neutral-500">接下來的行程</p>
      {data.upcoming.length === 0 ? (
        <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-400 dark:bg-neutral-900">
          未來七天目前沒有排定行程
        </p>
      ) : (
        <ul className="space-y-1.5">
          {data.upcoming.map((u, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-900"
            >
              <span className="text-neutral-700 dark:text-neutral-200">{u.title}</span>
              <span className="shrink-0 text-neutral-400">{u.label}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
