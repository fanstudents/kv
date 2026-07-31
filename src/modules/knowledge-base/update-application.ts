import type { KnowledgeDoc } from "@/lib/knowledge-base-data";
import type { KnowledgeBaseUpdatePort } from "./update-ports";
import type { KnowledgeBaseUpdateInput } from "./update-rules";

export type KnowledgeBaseUpdateResult =
  | { kind: "ok"; data: KnowledgeDoc }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

export async function runKnowledgeBaseUpdate(
  input: KnowledgeBaseUpdateInput,
  port: KnowledgeBaseUpdatePort,
): Promise<KnowledgeBaseUpdateResult> {
  try {
    const data = await port.update(input);
    if (!data) return { kind: "not-found" };
    return { kind: "ok", data };
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : "更新失敗" };
  }
}
