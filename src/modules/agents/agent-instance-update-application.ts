import type { AgentInstanceUpdatePort } from "./agent-instance-update-ports";
import { parseAgentInstanceUpdateRequest, type AgentInstanceUpdateBody } from "./agent-instance-update-rules";

export type AgentInstanceUpdateResult =
  | { kind: "updated"; data: Record<string, unknown> | null }
  | { kind: "error"; message: string };

export async function runAgentInstanceUpdate(
  slug: string,
  body: AgentInstanceUpdateBody,
  port: AgentInstanceUpdatePort,
  now?: string
): Promise<AgentInstanceUpdateResult> {
  const input = parseAgentInstanceUpdateRequest(slug, body, now);
  const result = await port.updateBySlug(input.slug, input.update);

  if (result.errorMessage) {
    await port.recordActivity({
      agent_slug: slug,
      summary: `更新設定失敗：${result.errorMessage}`,
      status: "failed",
    });
    return { kind: "error", message: result.errorMessage };
  }

  if (input.enabledChanged) {
    await port.recordActivity({
      agent_slug: slug,
      summary: body.enabled ? "Agent 已啟用" : "Agent 已停用",
      status: "success",
    });
  }
  if (input.settingsChanged) {
    await port.recordActivity({ agent_slug: slug, summary: "已更新 Agent 設定", status: "success" });
  }

  return { kind: "updated", data: result.data };
}
