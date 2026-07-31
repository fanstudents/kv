export type AgentTestPushStyle = "text" | "flex" | "confirm" | "buttons";
export type AgentTestPushChannel = "primary" | "support";

const VALID_STYLES: AgentTestPushStyle[] = ["text", "flex", "confirm", "buttons"];
const STYLE_LABELS: Record<AgentTestPushStyle, string> = {
  text: "純文字",
  flex: "Flex 卡片",
  confirm: "確認按鈕",
  buttons: "按鈕選單",
};

export interface AgentTestPushBody {
  to?: unknown;
  text?: unknown;
  style?: unknown;
  title?: unknown;
  accentColor?: unknown;
}

export interface AgentTestPushInput {
  slug: string;
  to: string;
  text: string;
  style: AgentTestPushStyle;
  styleLabel: string;
  title: string;
  accentColor: string;
  channel: AgentTestPushChannel;
}

export type AgentTestPushParseResult =
  | { kind: "valid"; input: AgentTestPushInput }
  | { kind: "invalid"; message: string };

export function parseAgentTestPushRequest(
  slug: string,
  body: AgentTestPushBody
): AgentTestPushParseResult {
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";
  const candidateStyle = body.style as AgentTestPushStyle;
  const style: AgentTestPushStyle = VALID_STYLES.includes(candidateStyle) ? candidateStyle : "text";
  const title = typeof body.title === "string" && body.title ? body.title : "通知";
  const accentColor =
    typeof body.accentColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.accentColor)
      ? body.accentColor
      : "#06C755";

  if (!to) return { kind: "invalid", message: "缺少測試對象 LINE User ID" };
  if (!text) return { kind: "invalid", message: "缺少要推播的訊息內容" };

  return {
    kind: "valid",
    input: {
      slug,
      to,
      text,
      style,
      styleLabel: STYLE_LABELS[style],
      title,
      accentColor,
      channel: slug === "support" ? "support" : "primary",
    },
  };
}

export interface AgentTestPushDelivery {
  to: string;
  text: string;
  style: AgentTestPushStyle;
  title: string;
  accentColor: string;
  channel: AgentTestPushChannel;
}

export interface AgentTestPushActivity {
  agent_slug: string;
  summary: string;
  status: "failed" | "success";
}

export interface AgentTestPushPort {
  send(delivery: AgentTestPushDelivery): Promise<void>;
  recordFailure(activity: AgentTestPushActivity): Promise<void>;
  recordSuccess(activity: AgentTestPushActivity): Promise<Record<string, unknown> | null>;
}

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
