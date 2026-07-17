// LINE 推播樣式定義與訊息建構器（client 取型別、server 組實際 payload 共用）

export type PushStyle = "text" | "flex" | "confirm" | "buttons";

export const PUSH_STYLES: { value: PushStyle; label: string; hint: string }[] = [
  { value: "text", label: "純文字", hint: "最基本的文字訊息" },
  { value: "flex", label: "Flex 卡片", hint: "彩色標題卡片＋按鈕" },
  { value: "confirm", label: "確認按鈕", hint: "訊息＋確認/取消兩鍵" },
  { value: "buttons", label: "按鈕選單", hint: "標題＋多個選項按鈕" },
];

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function buildPushMessages(params: {
  style: PushStyle;
  text: string;
  title: string;
  accentColor: string;
  linkUrl?: string;
}): unknown[] {
  const { style, text, title, accentColor } = params;
  const linkUrl = params.linkUrl || process.env.APP_BASE_URL || "https://kva.zeabur.app";

  switch (style) {
    case "flex":
      return [
        {
          type: "flex",
          altText: truncate(text, 400),
          contents: {
            type: "bubble",
            header: {
              type: "box",
              layout: "vertical",
              backgroundColor: accentColor,
              paddingAll: "16px",
              contents: [
                { type: "text", text: title, weight: "bold", color: "#ffffff", size: "md" },
              ],
            },
            body: {
              type: "box",
              layout: "vertical",
              paddingAll: "16px",
              contents: [{ type: "text", text: truncate(text, 2000), wrap: true, size: "sm", color: "#333333" }],
            },
            footer: {
              type: "box",
              layout: "vertical",
              paddingAll: "12px",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: accentColor,
                  height: "sm",
                  action: { type: "uri", label: "查看詳情", uri: linkUrl },
                },
              ],
            },
          },
        },
      ];

    case "confirm":
      return [
        {
          type: "template",
          altText: truncate(text, 400),
          template: {
            type: "confirm",
            text: truncate(text, 240),
            actions: [
              { type: "message", label: "確認", text: "確認" },
              { type: "message", label: "取消", text: "取消" },
            ],
          },
        },
      ];

    case "buttons":
      return [
        {
          type: "template",
          altText: truncate(text, 400),
          template: {
            type: "buttons",
            title: truncate(title, 40),
            text: truncate(text, 60),
            actions: [
              { type: "uri", label: "查看詳情", uri: linkUrl },
              { type: "message", label: "稍後提醒我", text: "稍後提醒我" },
              { type: "message", label: "暫停通知", text: "暫停通知" },
            ],
          },
        },
      ];

    case "text":
    default:
      return [{ type: "text", text }];
  }
}
