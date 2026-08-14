"use client";

import { useEffect, useState } from "react";
import type { SnapshotRow } from "./agent-memory";

// 目標卡片的趨勢資料：/api/goals/history 的前端快取。
//
// 同一個 metricId 在畫面上常常會出現不只一次（總覽頁每個 Agent 一張卡、
// Agent 自己頁面又畫一次同一份目標），所以用 module-level 快取避免重複打 API；
// 快取沒有主動失效機制——這頁的資料本來就是每日一筆的快照，不需要即時。

interface HistoryResult {
  points: SnapshotRow[];
  error: string | null;
}

const cache = new Map<string, SnapshotRow[]>();
const inflight = new Map<string, Promise<HistoryResult>>();

interface HistoryState {
  key: string;
  points: SnapshotRow[];
  loading: boolean;
  error: string | null;
}

export function parseGoalHistoryResponse(data: unknown): SnapshotRow[] {
  if (!data || typeof data !== "object" || !Array.isArray((data as { points?: unknown }).points)) {
    throw new Error("目標趨勢回應格式錯誤");
  }
  return (data as { points: SnapshotRow[] }).points;
}

function getHistoryState(key: string): HistoryState {
  return {
    key,
    points: cache.get(key) ?? [],
    loading: !cache.has(key),
    error: null,
  };
}

async function fetchHistory(metricId: string, days: number): Promise<HistoryResult> {
  const key = `${metricId}:${days}`;
  if (cache.has(key)) return { points: cache.get(key)!, error: null };
  if (inflight.has(key)) return inflight.get(key)!;

  const p = fetch(`/api/goals/history?metricId=${encodeURIComponent(metricId)}&days=${days}`)
    .then((r) => {
      if (!r.ok) throw new Error(`目標趨勢讀取失敗（${r.status}）`);
      return r.json();
    })
    .then((d) => {
      const points = parseGoalHistoryResponse(d);
      cache.set(key, points);
      return { points, error: null };
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "目標趨勢讀取失敗";
      console.error("[goals] history load failed", error);
      return { points: [] as SnapshotRow[], error: message };
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/** 某個指標近 N 天的快照走勢（目標卡上的 sparkline 用） */
export function useMetricHistory(metricId: string, days = 30) {
  const key = `${metricId}:${days}`;
  const [state, setState] = useState<HistoryState>(() => getHistoryState(key));
  const current = state.key === key ? state : getHistoryState(key);

  useEffect(() => {
    let cancelled = false;
    if (cache.has(key)) return;

    fetchHistory(metricId, days).then((result) => {
      if (!cancelled) setState({ key, points: result.points, loading: false, error: result.error });
    });

    return () => {
      cancelled = true;
    };
  }, [key, metricId, days]);

  return { points: current.points, loading: current.loading, error: current.error };
}
