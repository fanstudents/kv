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
