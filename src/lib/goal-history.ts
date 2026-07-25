"use client";

import { useEffect, useState } from "react";
import type { SnapshotRow } from "./agent-memory";

// 目標卡片的趨勢資料：/api/goals/history 的前端快取。
//
// 同一個 metricId 在畫面上常常會出現不只一次（總覽頁每個 Agent 一張卡、
// Agent 自己頁面又畫一次同一份目標），所以用 module-level 快取避免重複打 API；
// 快取沒有主動失效機制——這頁的資料本來就是每日一筆的快照，不需要即時。

const cache = new Map<string, SnapshotRow[]>();
const inflight = new Map<string, Promise<SnapshotRow[]>>();

async function fetchHistory(metricId: string, days: number): Promise<SnapshotRow[]> {
  const key = `${metricId}:${days}`;
  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = fetch(`/api/goals/history?metricId=${encodeURIComponent(metricId)}&days=${days}`)
    .then((r) => (r.ok ? r.json() : { points: [] }))
    .then((d) => {
      const points = Array.isArray(d.points) ? (d.points as SnapshotRow[]) : [];
      cache.set(key, points);
      return points;
    })
    .catch(() => [] as SnapshotRow[])
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/** 某個指標近 N 天的快照走勢（目標卡上的 sparkline 用） */
export function useMetricHistory(metricId: string, days = 30) {
  const key = `${metricId}:${days}`;
  const [points, setPoints] = useState<SnapshotRow[]>(() => cache.get(key) ?? []);
  const [loading, setLoading] = useState(!cache.has(key));

  useEffect(() => {
    let cancelled = false;
    if (cache.has(key)) {
      setPoints(cache.get(key)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchHistory(metricId, days).then((p) => {
      if (!cancelled) {
        setPoints(p);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key, metricId, days]);

  return { points, loading };
}
