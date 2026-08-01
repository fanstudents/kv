import "server-only";

import { z } from "zod";
import { createChatCompletion } from "@/adapters/openai/client";

export interface OpenAiAgentProfile {
  slug: string;
  name: string;
  role: string;
  description: string;
}

export interface ActionPlanItem {
  label: string;
  detail?: string;
}

const actionPlanSchema = z.object({
  title: z.string().optional(),
  items: z
    .array(z.object({ label: z.string(), detail: z.string().optional() }))
    .optional(),
});

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function replyToAgentChat(params: {
  agent: OpenAiAgentProfile;
  message: string;
  liveContext?: string;
  history?: string;
  isTeamLead?: boolean;
}): Promise<string> {
  const data = await createChatCompletion(
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `你是 ${params.agent.name}，職務是「${params.agent.role}」。你的職掌：${params.agent.description}。\n` +
            "老闆正在網站的聊天視窗傳訊息給你，這是日常對話，不是正式會議或簡報。請用自然口語、" +
            "有個性的繁體中文回覆，像在跟熟識的同事互傳訊息一樣，通常 1～3 句話講重點即可，" +
            "不要條列、不要每次都用「您好」這種罐頭客套開場白。\n" +
            (params.isTeamLead
              ? "你是 Team Lead 大總管，若老闆問起團隊整體狀況，簡短點出重點分工即可，不要長篇。\n"
              : "") +
            "重要：下面「真實業務資料」區塊裡的內容才是你實際可以引用的記錄，要主動運用它回答問題——" +
            "老闆問的用詞不一定跟資料裡的說法一模一樣，只要內容相關就要引用、換句話說給他聽，具體講出" +
            "名字、時間、狀態；真的完全找不到相關線索時，才照實說目前沒有這筆資料或還沒串接到對應系統，" +
            "絕對不要編造數字、名字或記錄。\n" +
            (params.liveContext
              ? `\n【真實業務資料】\n${params.liveContext}\n`
              : "\n【真實業務資料】目前沒有可用的真實資料。\n"),
        },
        {
          role: "user",
          content:
            (params.history ? `先前對話：\n${params.history}\n\n` : "") +
            `老闆傳來的訊息：\n「${params.message}」`,
        },
      ],
      temperature: 0.7,
      max_tokens: 400,
    },
    { operation: "網站聊天回應", agentSlug: params.agent.slug }
  );

  return (data.choices[0]?.message.content ?? "").trim();
}

export async function extractAgentActionPlan(params: {
  agent: OpenAiAgentProfile;
  message: string;
  replyText: string;
}): Promise<{ title: string; items: ActionPlanItem[] } | null> {
  const data = await createChatCompletion(
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "把一段同事對老闆的口語回覆，整理成 2-5 條具體、可執行的行動項目，給老闆在畫面上看的行動方案卡。" +
            "每條 label 要簡短(不超過 20 字)，可以的話附一句更細的說明放在 detail(選填)。" +
            '只回傳 JSON 物件：{"title": "這份行動方案的標題", "items": [{"label": "...", "detail": "..."}]}。' +
            '如果這段回覆內容根本沒有具體可執行的行動(只是閒聊、單純回答事實或數字)，回傳 {"items": []}，不要硬湊。',
        },
        {
          role: "user",
          content: `老闆問：「${params.message}」\n${params.agent.name}回覆：「${params.replyText}」\n請整理成行動方案。`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 300,
    },
    { operation: "指揮台行動方案萃取", agentSlug: params.agent.slug }
  );

  const parsed = actionPlanSchema.safeParse(
    parseJson(data.choices[0]?.message.content ?? "{}")
  );
  if (!parsed.success) return null;
  const items = (parsed.data.items ?? [])
    .map((item) => ({ ...item, label: item.label.trim() }))
    .filter((item) => item.label.length > 0);
  if (items.length === 0) return null;
  return { title: parsed.data.title?.trim() || "行動方案", items };
}
