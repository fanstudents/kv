export type KnowledgeBaseRecheckAuthDecision =
  | { kind: "authorized" }
  | { kind: "misconfigured"; message: string; status: 503 }
  | { kind: "unauthorized"; message: string; status: 401 };

export function parseKnowledgeBaseRecheckAuth(
  expectedSecret: string | undefined,
  providedSecret: string | null
): KnowledgeBaseRecheckAuthDecision {
  if (!expectedSecret) {
    return { kind: "misconfigured", message: "server misconfigured: CRON_SECRET not set", status: 503 };
  }
  if (providedSecret !== expectedSecret) {
    return { kind: "unauthorized", message: "unauthorized", status: 401 };
  }
  return { kind: "authorized" };
}
