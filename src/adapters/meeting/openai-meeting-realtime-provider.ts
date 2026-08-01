import "server-only";

import { createRealtimeClientSecret } from "@/adapters/openai/client";
import { AGENTS } from "@/lib/agent-data";
import type {
  RealtimeSessionMintInput,
  RealtimeSessionProvider,
} from "@/modules/meeting/realtime";

const REALTIME_MODEL = "gpt-realtime-2.1";

function colleagueRoster(): string {
  return AGENTS.filter((agent) => agent.status === "active")
    .map((agent) => `${agent.slug}＝${agent.personEn} ${agent.personZh}（${agent.role}）`)
    .join("；");
}

function realtimeTools() {
  const active = AGENTS.filter((agent) => agent.status === "active");
  return [
    {
      type: "function",
      name: "switch_to_colleague",
      description:
        "當老闆的話裡明確想找『另一位』同事講話時呼叫（提到別人的名字、職稱，或說「換下一位」「請 XXX 來」）。" +
        "呼叫後你不用再回答問題內容，該同事會立刻接手對話。\n" +
        `同事代號對照表：${colleagueRoster()}`,
      parameters: {
        type: "object",
        properties: {
          target: {
            type: "string",
            enum: active.map((agent) => agent.slug),
            description:
              "要交棒的同事代號（slug）——依上面的對照表，用老闆提到的名字或職稱查出對應的 slug，不要用猜的。",
          },
        },
        required: ["target"],
      },
    },
    {
      type: "function",
      name: "show_result",
      description:
        "當你要跟老闆報告具體內容（數字、清單、比較、結論）時呼叫，把內容用適合的形式顯示在畫面上；" +
        "你仍用語音簡短講重點，不需要把畫面上每個字都唸出來。",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["table", "chart", "metrics", "text", "conclusion"] },
          title: { type: "string", description: "這份內容的標題" },
          text: { type: "string", description: "kind 為 text 或 conclusion 時的內容" },
          table: {
            type: "object",
            properties: {
              columns: { type: "array", items: { type: "string" } },
              rows: { type: "array", items: { type: "array", items: { type: "string" } } },
            },
          },
          chart: {
            type: "array",
            description: "kind 為 chart 時：一組 {label, value} 的長條圖資料",
            items: {
              type: "object",
              properties: { label: { type: "string" }, value: { type: "number" } },
              required: ["label", "value"],
            },
          },
          metrics: {
            type: "array",
            description: "kind 為 metrics 時：一組重點數字卡",
            items: {
              type: "object",
              properties: { label: { type: "string" }, value: { type: "string" } },
              required: ["label", "value"],
            },
          },
        },
        required: ["kind", "title"],
      },
    },
  ];
}

function meetingInstructions(cfg: RealtimeSessionMintInput): string {
  return (
    `你是 ${cfg.agentName}，職務是「${cfg.role}」。你的職掌：${cfg.description}。\n` +
    "老闆正在視訊會議上跟你即時語音對話，你的回覆會直接用語音唸出來。請用第一人稱、口語、" +
    "簡短俐落地回應——像真人開會一來一回，通常 1～2 句就講完重點，絕對不要長篇大論、不要條列。" +
    "語氣自然有精神、語速正常偏快，說台灣腔繁體中文。\n" +
    "如果老闆問到你負責範圍內的具體資料或成效（數字、清單、比較、結論），呼叫 show_result 工具把內容" +
    "顯示在畫面上，語音只需要簡短講重點，不用把畫面上每個字都唸出來。\n" +
    "如果老闆的話裡提到「別的同事的名字或職稱」（不是在跟你說話，而是要找別人），呼叫 switch_to_colleague 工具" +
    "（帶該同事代號），同時只需要極簡短交棒，像「好，交給他」（不超過一句話），絕對不要真的回答問題內容。" +
    `同事代號對照表：${colleagueRoster()}。老闆可能用英文名、中文名或職稱稱呼，都要對照這份表查出正確代號，不要用猜的。\n` +
    "重要：下面「真實業務資料」區塊裡的內容才是你實際可以引用的記錄，要主動運用它回答問題——" +
    "老闆問的用詞不一定跟資料裡的說法一模一樣（例如問「邀約名單」，資料裡可能是「近期名片與回覆狀況」" +
    "這種形式），只要內容相關就要引用、換句話說給他聽，具體講出名字、公司、狀態，不要因為字面對不上" +
    "就說沒有。真的完全找不到相關線索時，才照實說目前沒有這筆資料或還沒串接到對應系統，" +
    "絕對不要編造數字、名字或記錄。\n" +
    (cfg.isTeamLead ? "你是 Team Lead 大總管，若老闆請你統整，簡短點出團隊分工即可，不要長篇。\n" : "") +
    (cfg.liveContext
      ? `\n【真實業務資料】\n${cfg.liveContext}\n`
      : "\n【真實業務資料】目前沒有可用的真實資料。\n") +
    (cfg.history ? `\n先前會議脈絡（供你參考，不用主動複述）：\n${cfg.history}` : "")
  );
}

async function mintRealtimeSession(cfg: RealtimeSessionMintInput) {
  const secret = await createRealtimeClientSecret({
    type: "realtime",
    model: REALTIME_MODEL,
    audio: {
      input: {
        transcription: { model: "whisper-1" },
        turn_detection: { type: "semantic_vad", eagerness: "high" },
      },
      output: { voice: cfg.voice },
    },
    instructions: meetingInstructions(cfg),
    tools: realtimeTools(),
    tool_choice: "auto",
  });
  if (!secret.value) throw new Error("OpenAI 未回傳有效的即時語音 session token");
  return { token: secret.value, expiresAt: secret.expiresAt, model: REALTIME_MODEL };
}

export function createOpenAiMeetingRealtimeProvider(): RealtimeSessionProvider {
  return {
    mint(input) {
      return mintRealtimeSession(input);
    },
  };
}
