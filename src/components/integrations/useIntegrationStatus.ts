"use client";

import { useEffect, useState } from "react";
import type { IntegrationStatusMap } from "@/lib/integration-status";

/**
 * Reads the one status-map endpoint used by agent status surfaces.
 *
 * Deliberately keeps the original callers' contract: a non-OK response becomes
 * `null`, a network/JSON failure leaves the current `null` state untouched, and
 * a completed request cannot update an unmounted component.
 */
export function useIntegrationStatus(): IntegrationStatusMap | null {
  const [status, setStatus] = useState<IntegrationStatusMap | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/integrations/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => alive && setStatus(data))
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  return status;
}
