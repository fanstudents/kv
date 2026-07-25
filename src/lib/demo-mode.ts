"use client";

import { useSyncExternalStore } from "react";

// 示範模式：對學員展示時，整個介面（後台面板、劇院模式、目標達成率）都用預先準備好的
// 示範資料呈現，畫面永遠有東西可看；關掉之後，介面改成「如實呈現」——每位 Agent 只顯示
// 真正接上的服務、真正跑過的紀錄，沒接的就明說沒接，不用假數字撐場面。
//
// 預設是開啟（維持現況）。跟行銷模式 marketing-mode.ts 同一套寫法：localStorage +
// 自訂事件跨元件同步，useSyncExternalStore 讓 SSR 與 hydration 不會對不上。

const STORAGE_KEY = "kv-demo-mode";
const CHANGE_EVENT = "kv-demo-mode-change";

export function isDemoModeOn(): boolean {
  if (typeof window === "undefined") return true;
  // 沒設定過＝維持預設的示範模式
  return localStorage.getItem(STORAGE_KEY) !== "0";
}

export function setDemoMode(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
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

function getServerSnapshot() {
  return true;
}

export function useDemoMode(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, isDemoModeOn, getServerSnapshot);
  return [on, setDemoMode];
}
