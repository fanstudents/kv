import "server-only";

import { z } from "zod";
import { createChatCompletion } from "@/adapters/openai/client";
import type {
  MeetingCommandReplyInput,
  MeetingCommandRoundInput,
  MeetingCommandRoundResult,
  MeetingConversationProvider,
} from "@/modules/meeting/conversation";

const meetingRoundSchema = z.object({
  replies: z
    .array(z.object({ slug: z.string(), text: z.string() }))
    .optional(),
  teamlead: z.string().optional(),
});

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function runMeetingRound(
  params: MeetingCommandRoundInput
): Promise<MeetingCommandRoundResult> {
  const roster = params.agents
    .map((agent) => `- slug=${agent.slug}｜${agent.name}｜${agent.role}｜職掌：${agent.description}`)
    .join("\n");

  const data = await createChatCompletion(
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一間公司 AI 代理團隊的『會議引擎』。老闆會在視訊會議上用口語下達一句指令，" +
            "你要判斷哪些 AI 同事和這句指令相關，讓他們各自用第一人稱、口語、簡短（每人 1～2 句）、" +
            "有個性且專業地回應——說明自己會怎麼承接、負責哪一塊、下一步做什麼。只挑真正相關的同事回應" +
            "（最多 5 位，寧缺勿濫，不相關的不要硬湊）。" +
            `最後由 Team Lead（${params.teamLead.name}，${params.teamLead.role}）統整成一段給老闆的結論（2～3 句）：` +
            "點出誰負責什麼、彼此如何協作、下一步與預計回報時間。全部用繁體中文、語氣自然像真人開會。" +
            '只回傳 JSON 物件，格式為 {"replies":[{"slug":"...","text":"..."}],"teamlead":"..."}。' +
            "replies 的 slug 必須來自我提供的名單。",
        },
        {
          role: "user",
          content:
            `可回應的同事名單：\n${roster}\n\n` +
            (params.history ? `先前會議脈絡：\n${params.history}\n\n` : "") +
            `老闆這次的指令（語音轉文字，可能有口語或辨識誤差，請合理理解）：\n「${params.command}」`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    },
    { operation: "會議室回應", agentSlug: "teamlead" }
  );

  const parsed = meetingRoundSchema.safeParse(
    parseJson(data.choices[0]?.message.content ?? "{}")
  );
  const value = parsed.success ? parsed.data : {};
  const allowed = new Set(params.agents.map((agent) => agent.slug));
  const replies = (value.replies ?? [])
    .filter((reply) => allowed.has(reply.slug))
    .map((reply) => ({ slug: reply.slug, text: reply.text.trim() }))
    .filter((reply) => reply.text.length > 0);

  return {
    replies,
    teamlead:
      value.teamlead?.trim() || "我先幫大家對齊重點，稍後彙整成待辦回報給您。",
  };
}

async function replyAsAgent(params: MeetingCommandReplyInput): Promise<string> {
  const data = await createChatCompletion(
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `你是 ${params.agent.name}，職務是「${params.agent.role}」。你的職掌：${params.agent.description}。\n` +
            "老闆正在視訊會議上單獨對你說話。請用第一人稱、口語、專業又有個性的方式「極簡短」回覆" +
            "（1～2 句、直接講重點，像節奏明快的會議）：說明你會怎麼承接、下一步做什麼。" +
            (params.isTeamLead
              ? "你是 Team Lead 大總管，統整分工時也一樣精簡，點到為止。"
              : "") +
            "全部用繁體中文，語氣自然像真人開會，不要條列、不要罐頭客套開場白。只回覆你要說的話本身。",
        },
        {
          role: "user",
          content:
            (params.history ? `會議脈絡：\n${params.history}\n\n` : "") +
            `老闆對你說（語音轉文字，可能有口語或辨識誤差，請合理理解）：\n「${params.command}」`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    },
    { operation: "會議一對一回應", agentSlug: params.agent.slug }
  );

  return (data.choices[0]?.message.content ?? "").trim();
}

export function createOpenAiMeetingConversationProvider(): MeetingConversationProvider {
  return {
    oneToOne(input) {
      return replyAsAgent(input);
    },
    round(input) {
      return runMeetingRound(input);
    },
  };
}
