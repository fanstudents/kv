"use client";

import { useEffect, useState } from "react";
import type { IntegrationStatusMap } from "@/lib/integration-status";

export interface IntegrationStatusQuery {
  status: IntegrationStatusMap | null;
  loading: boolean;
  error: string | null;
}

/**
 * Reads the one status-map endpoint used by agent status surfaces.
 *
 * The query state distinguishes loading from a failed probe. A failed probe
 * must not look like an endlessly pending request or silently become a live
 * disconnected result.
 */
export function useIntegrationStatusState(): IntegrationStatusQuery {
  const [query, setQuery] = useState<IntegrationStatusQuery>({
    status: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    fetch("/api/integrations/status")
      .then((response) => {
        if (!response.ok) throw new Error(`整合狀態讀取失敗（${response.status}）`);
        return response.json();
      })
      .then((data) => {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("整合狀態格式錯誤");
        }
        if (alive) setQuery({ status: data as IntegrationStatusMap, loading: false, error: null });
      })
      .catch((error) => {
        if (!alive) return;
        const message = error instanceof Error ? error.message : "整合狀態讀取失敗";
        console.error("[integrations] status load failed", error);
        setQuery({ status: null, loading: false, error: message });
      });

    return () => {
      alive = false;
    };
  }, []);

  return query;
}
