"use client";

import { useSyncExternalStore } from "react";

// 行銷模式：展示給行銷人看時，把畫面收斂成只剩行銷 Team 的 Agent（側欄、團隊總覽、
// 辦公室場景都吃這個狀態）。存在 localStorage、用自訂事件跨元件同步，純前端開關，
// 不用後端也不用 URL 參數。
//
// 用 useSyncExternalStore 而不是「useState + useEffect 讀 localStorage」：
// 後者的初始值在伺服器端永遠是 false，但 client 端第一次渲染（hydration）若直接讀
// localStorage 拿到 true，會跟伺服器輸出的 HTML 對不上，觸發 hydration mismatch。
// useSyncExternalStore 的 getServerSnapshot 讓 SSR 與 client 首次渲染都先吃 false，
// hydration 完成後才切到真正的 localStorage 值，是 React 官方替這種情境設計的寫法。

const STORAGE_KEY = "kv-marketing-mode";
const CHANGE_EVENT = "kv-marketing-mode-change";

export function isMarketingModeOn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function setMarketingMode(on: boolean) {
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
  return false;
}

export function useMarketingMode(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, isMarketingModeOn, getServerSnapshot);
  return [on, setMarketingMode];
}
