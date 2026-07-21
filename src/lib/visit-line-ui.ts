// 約拜訪 Agent 的 LINE 互動元件：要／不要 Flex 卡片、標籤快速回覆選單。

export function buildDecisionCard(params: {
  offerId: string;
  name: string;
  company?: string | null;
}) {
  const subtitle = params.company ? `${params.name} · ${params.company}` : params.name;
  return {
    type: "flex",
    altText: "要幫你安排拜訪邀約嗎？",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "要幫你安排拜訪邀約嗎？", weight: "bold", size: "lg", color: "#111111" },
          { type: "text", text: subtitle, size: "sm", color: "#888888", wrap: true },
          { type: "text", text: "我會查你近期行事曆空檔、草擬一封邀約信給對方。", size: "xs", color: "#AAAAAA", wrap: true, margin: "md" },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#06C755",
            height: "sm",
            action: { type: "postback", label: "要，安排", data: `action=confirm&offer=${params.offerId}`, displayText: "要，幫我安排" },
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: { type: "postback", label: "先不要", data: `action=cancel&offer=${params.offerId}`, displayText: "先不要" },
          },
        ],
      },
    },
  };
}

export function buildTagQuickReply(params: { contactId: string; tags: string[] }) {
  const items = params.tags.slice(0, 12).map((t) => ({
    type: "action",
    action: {
      type: "postback",
      label: t.length > 20 ? t.slice(0, 20) : t,
      data: `action=tag&contact=${params.contactId}&value=${encodeURIComponent(t)}`,
      displayText: `標籤：${t}`,
    },
  }));
  items.push({
    type: "action",
    action: { type: "postback", label: "✓ 標好了", data: "action=tag_done", displayText: "標籤完成" },
  });
  return {
    type: "text",
    text: "順手幫這位客戶分類？點標籤即可（可多選）：",
    quickReply: { items },
  };
}
