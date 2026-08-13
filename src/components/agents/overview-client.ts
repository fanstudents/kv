"use client";

import { useEffect, useState } from "react";

type OverviewApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error?: string };

interface OverviewState<T> {
  endpoint: string | null;
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Client owner for read-only Agent overview endpoints.
 * Endpoint changes cancel the previous request so an older range cannot replace newer data.
 */
export function useAgentOverview<T>(endpoint: string | null) {
  const [state, setState] = useState<OverviewState<T>>({
    endpoint,
    data: null,
    error: null,
    loading: endpoint !== null,
  });

  useEffect(() => {
    if (!endpoint) return;

    const controller = new AbortController();

    fetch(endpoint, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as OverviewApiResponse<T>;
        if (!response.ok || !body.ok) {
          throw new Error(body.ok ? "讀取失敗" : body.error ?? "讀取失敗");
        }
        return body.data;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ endpoint, data, error: null, loading: false });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          endpoint,
          data: null,
          error: error instanceof Error ? error.message : "讀取失敗",
          loading: false,
        });
      });

    return () => controller.abort();
  }, [endpoint]);

  if (state.endpoint !== endpoint) {
    return { data: null, error: null, loading: endpoint !== null };
  }

  return { data: state.data, error: state.error, loading: state.loading };
}
