import type { AgentTestPushPort } from "./test-push-ports";
import type { AgentTestPushInput } from "./test-push-rules";

export type AgentTestPushResult =
  | { kind: "success"; ok: true; activity: Record<string, unknown> | null }
  | { kind: "error"; message: string };

export async function runAgentTestPush(
  input: AgentTestPushInput,
  port: AgentTestPushPort
): Promise<AgentTestPushResult> {
  try {
    await port.send({
      to: input.to,
      text: input.text,
      style: input.style,
      title: input.title,
      accentColor: input.accentColor,
      channel: input.channel,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "推播失敗";
    await port.recordFailure({
      agent_slug: input.slug,
      summary: `測試推播失敗（${input.styleLabel}）：${message}`,
      status: "failed",
    });
    return { kind: "error", message };
  }

  const activity = await port.recordSuccess({
    agent_slug: input.slug,
    summary: `已透過 LINE Messaging API 送出測試推播（${input.styleLabel}樣式）`,
    status: "success",
  });
  return { kind: "success", ok: true, activity };
}
