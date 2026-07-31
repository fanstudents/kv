import type { KnowledgeAccessUpdatePort } from "./access-ports";
import type { KnowledgeAccessUpdateParseResult } from "./access-rules";

export type KnowledgeAccessUpdateResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok" };

export async function runKnowledgeAccessUpdate(
  parsed: KnowledgeAccessUpdateParseResult,
  port: KnowledgeAccessUpdatePort,
): Promise<KnowledgeAccessUpdateResult> {
  if (parsed.kind === "invalid") return parsed;
  await port.setAccess(parsed.input.agentSlug, parsed.input.level);
  return { kind: "ok" };
}
