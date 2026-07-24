"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_GOALS, type AgentGoal } from "./agent-goals";

// 目標設定的前端儲存：存在 localStorage、用自訂事件跨元件同步（跟行銷模式 marketing-mode.ts
// 同一套寫法）。目標是「指揮官自己設定的管理目標」，不需要後端也能立刻設定與展示；
// 之後要改存 Supabase，只要把 read/write 換成 API 呼叫、其餘元件不用動。
//
// useSyncExternalStore 需要「同一份資料要回傳同一個參考」，否則會無限重繪，
// 所以這裡自己做一層快取：只有真的寫入時才重新 parse。

const STORAGE_KEY = "kv-agent-goals";
const CHANGE_EVENT = "kv-agent-goals-change";

let cache: AgentGoal[] | null = null;
let cacheRaw: string | null = null;

function read(): AgentGoal[] {
  if (typeof window === "undefined") return DEFAULT_GOALS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return DEFAULT_GOALS;
  if (raw === cacheRaw && cache) return cache;
  try {
    const parsed = JSON.parse(raw);
    cache = Array.isArray(parsed) ? (parsed as AgentGoal[]) : DEFAULT_GOALS;
  } catch {
    cache = DEFAULT_GOALS;
  }
  cacheRaw = raw;
  return cache;
}

function write(goals: AgentGoal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerSnapshot(): AgentGoal[] {
  return DEFAULT_GOALS;
}

/** 新增或更新一筆目標（id 已存在就覆蓋） */
export function saveGoal(goal: AgentGoal) {
  const goals = read();
  const idx = goals.findIndex((g) => g.id === goal.id);
  const next = idx >= 0 ? goals.map((g) => (g.id === goal.id ? goal : g)) : [...goals, goal];
  write(next);
}

export function removeGoal(id: string) {
  write(read().filter((g) => g.id !== id));
}

/** 回到示範用的預設目標（展示前重置很方便） */
export function resetGoals() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  cache = null;
  cacheRaw = null;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function newGoalId(): string {
  return `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useAgentGoals(): AgentGoal[] {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}
