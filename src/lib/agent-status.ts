"use client";

import { useSyncExternalStore } from "react";
import { getLegacyAgentStatusCatalog } from "@/adapters/agents/legacy-agent-identity-adapter";
import type { AgentSlug } from "@/lib/types";

// 前端讀「這位 Agent 現在有沒有啟用」的單一入口，資料來自 line_agents 表。
// agent-data.ts 裡的 status 只當作還沒載入完成前的預設值——真正的開關在資料庫，
// 你在 Agent 頁面按停用，側欄的燈與劇院模式的值勤人數就會跟著變。

type StatusMap = Record<string, boolean>;

const fallback: StatusMap = Object.fromEntries(
  getLegacyAgentStatusCatalog().map((agent) => [agent.slug, agent.status === "active"])
);

let cache: StatusMap = fallback;
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load() {
  if (loading) return loading;
  loading = fetch("/api/agents")
    .then(async (r) => {
      if (!r.ok) throw new Error(`Agent status request failed (${r.status})`);
      return r.json();
    })
    .then((d) => {
      if (d?.enabled) {
        cache = d.enabled as StatusMap;
        loaded = true;
        listeners.forEach((l) => l());
      }
    })
    .catch((error) => {
      // Keep the last known status for the sidebar, but never hide a failed
      // live read from diagnostics. The page-level controls fail closed.
      console.error("[agent-status] live status read failed", error);
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

/** 重新拉一次（例如剛在 Agent 頁面切換了啟用狀態） */
export function refreshAgentStatus() {
  loaded = false;
  void load();
}

export function useAgentStatus(): StatusMap {
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => fallback
  );
}

export function useIsAgentActive(slug: AgentSlug): boolean {
  return useAgentStatus()[slug] ?? false;
}
