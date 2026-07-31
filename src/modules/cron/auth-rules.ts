export type CronAuthDecision =
  | { kind: "authorized" }
  | { kind: "misconfigured"; message: string; status: 503 }
  | { kind: "unauthorized"; message: string; status: 401 };

/**
 * Compatibility rule for the existing x-cron-key contract.
 * Keep the response vocabulary/statuses stable while routes migrate away from
 * inline guards.
 */
export function parseCronAuth(expectedSecret: string | undefined, providedSecret: string | null): CronAuthDecision {
  if (!expectedSecret) {
    return { kind: "misconfigured", message: "server misconfigured: CRON_SECRET not set", status: 503 };
  }
  if (providedSecret !== expectedSecret) {
    return { kind: "unauthorized", message: "unauthorized", status: 401 };
  }
  return { kind: "authorized" };
}
