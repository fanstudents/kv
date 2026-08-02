"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_GOALS, type AgentGoal } from "@/modules/goals/model";

// 目標的前端快取。資料本體存在 Supabase（agent_goals 表，見 supabase-goals-repository.ts）——
// 以前存在 localStorage，換一台電腦或換瀏覽器，指揮官設的目標就不見了。
//
// 這裡維持跟以前一樣的介面（useAgentGoals / saveGoal / removeGoal / resetGoals），
// 所以頁面不用改：差別只在寫入時會打 API，並在成功後更新快取讓畫面立刻反應。

let cache: AgentGoal[] = DEFAULT_GOALS;
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setCache(next: AgentGoal[]) {
  cache = next;
  loaded = true;
  emit();
}

async function load() {
  if (loading) return loading;
  loading = fetch("/api/goals")
    .then(async (response) => {
      if (!response.ok) throw new Error(`Goals request failed (${response.status})`);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data.goals)) throw new Error("Goals response is invalid");
      setCache(data.goals);
    })
    .catch((error) => {
      loaded = true;
      console.error("[goals] load failed", error);
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (!loaded) void load();
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): AgentGoal[] {
  return cache;
}

function getServerSnapshot(): AgentGoal[] {
  return DEFAULT_GOALS;
}

/** 新增或更新一筆目標 */
export async function saveGoal(goal: AgentGoal) {
  // 先樂觀更新畫面，再送出；失敗則回復這次操作前的快取。
  const previous = cache;
  const idx = cache.findIndex((g) => g.id === goal.id);
  setCache(idx >= 0 ? cache.map((g) => (g.id === goal.id ? goal : g)) : [...cache, goal]);
  const res = await fetch("/api/goals", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(goal),
  }).catch(() => null);
  if (!res?.ok) {
    setCache(previous);
    console.error("[goals] save failed", res?.status ?? "network error");
  }
}

export async function removeGoal(id: string) {
  const previous = cache;
  setCache(cache.filter((g) => g.id !== id));
  const res = await fetch(`/api/goals?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
  if (!res?.ok) {
    setCache(previous);
    console.error("[goals] delete failed", res?.status ?? "network error");
  }
}

/** 回到示範用的預設目標（展示前重置很方便） */
export async function resetGoals() {
  const res = await fetch("/api/goals", { method: "POST" }).catch(() => null);
  if (!res?.ok) {
    console.error("[goals] reset failed", res?.status ?? "network error");
    return;
  }
  const data = await res.json().catch(() => null);
  if (!Array.isArray(data?.goals)) {
    console.error("[goals] reset response is invalid");
    return;
  }
  setCache(data.goals);
}

export function newGoalId(): string {
  return `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useAgentGoals(): AgentGoal[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
