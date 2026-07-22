import "server-only";
import { logAiUsage } from "@/lib/ai-usage";
import { AGENTS } from "@/lib/agent-data";

const OPENAI_API_BASE = "https://api.openai.com/v1";

async function chatCompletion(
  body: Record<string, unknown>,
  meta: { operation: string; agentSlug?: string | null }
) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY environment variable");

  const res = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  // 記錄用量與成本（不阻塞回傳）
  await logAiUsage({
    operation: meta.operation,
    model: typeof body.model === "string" ? body.model : "unknown",
    usage: data.usage,
    agentSlug: meta.agentSlug,
  });
  return data;
}

export interface ParsedCard {
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
}

export async function parseBusinessCard(imageDataUrl: string): Promise<ParsedCard> {
  const data = await chatCompletion({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "你是名片辨識助手，辨識準確度是最重要的事。請逐字逐符號仔細比對圖片中印刷的文字，一個字都不能猜測或修改：\n" +
          "- 中文姓名、公司名、職稱：必須跟名片上印刷的字完全一致，不要用你以為常見的字取代（例如「昇」不要誤讀成「升」、「陳」不要誤讀成「陣」）。\n" +
          "- Email：務必包含正確的 @ 與網域，每個英文字母、數字都要核對，不要因為看起來像常見網域就自動改寫（例如不要把 .con 自動改成 .com，除非圖片上真的是 .com）。\n" +
          "- 電話：務必保留完整位數與正確的每一碼數字，不要四捨五入或憑印象填入常見號碼。\n" +
          "- 如果某個欄位因為印刷模糊、反光、字太小而無法百分之百確定，請填空字串，絕對不要用猜的填入看似合理的內容。\n" +
          "只回傳 JSON 物件，欄位為 name, company, title, email, phone。",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "請仔細辨識這張名片圖片中的聯絡資訊，注意小字與容易混淆的字元。" },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  }, { operation: "名片辨識", agentSlug: "visit" });

  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<ParsedCard> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    // leave parsed as {}
  }

  return {
    name: parsed.name ?? "",
    company: parsed.company ?? "",
    title: parsed.title ?? "",
    email: parsed.email ?? "",
    phone: parsed.phone ?? "",
  };
}

export async function draftInviteEmail(params: {
  contactName: string;
  contactTitle?: string;
  company?: string;
  meetingType: string;
  slot1: string;
  slot2: string;
  senderName: string;
}): Promise<{ subject: string; body: string }> {
  const data = await chatCompletion({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "你是一位很懂人情世故、文筆自然的商務人士，正要寫信給剛認識、想進一步聯繫的對象。請用繁體中文撰寫信件的開頭問候與內文：\n" +
          "1. 開頭先用 1-2 句話，根據對方的職稱與公司，寫出具體、真誠、不浮誇的觀察或讚美（例如點出對方角色或公司可能在意的事、值得欣賞之處），讓對方感覺到你是認真看過這張名片、真心想認識，而不是罐頭訊息。避免使用「久仰大名」「很高興認識您」這類制式開場白。\n" +
          "2. 接著自然帶出想約時間聊聊的原因，語氣像熟識的朋友寫信一樣輕鬆自在，避免過多驚嘆號、條列重點、或明顯是 AI 生成的距離感用詞。\n" +
          "3. 信件下方會另外附上可點選的時段按鈕、地點留言的說明、與結尾署名（由系統自動產生），所以內文不需要條列時段清單、不需要提到地點、也不需要自己加上結尾署名。\n" +
          "只回傳 JSON 物件，欄位為 subject 與 body。",
      },
      {
        role: "user",
        content: `寄件人：${params.senderName}\n收件人：${params.contactName}${
          params.contactTitle ? `，職稱：${params.contactTitle}` : ""
        }${params.company ? `，任職於 ${params.company}` : ""}\n邀約性質：${
          params.meetingType
        }\n請撰寫一封邀約信的開頭問候與內文，語氣自然真誠，像認識的朋友寫的，不要有 AI 生成的距離感。`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  }, { operation: "邀約信撰寫", agentSlug: "visit" });

  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<{ subject: string; body: string }> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    // leave parsed as {}
  }

  return {
    subject: parsed.subject ?? "",
    body: parsed.body ?? "",
  };
}

export type CardReplyIntent =
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "correction"; field: keyof ParsedCard; value: string }
  | { type: "other" };

/**
 * 判斷使用者針對「名片辨識結果」的回覆，是要確認送出、取消，還是在修正某個欄位
 * （例如「email 打錯了，應該是 abc@xyz.com」「他不是經理，是協理」）。
 * 比純關鍵字比對更能處理自然語句，且明確要求模型只能回傳看得懂的意圖，
 * 看不懂就回傳 other，交由呼叫端提示使用者換句話說，而不是硬猜。
 */
export async function interpretCardReply(params: {
  currentCard: ParsedCard;
  userText: string;
}): Promise<CardReplyIntent> {
  const data = await chatCompletion({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "使用者剛收到一張名片辨識結果，你要判斷他這句回覆的意圖，只能是下面四種之一：\n" +
          '1. confirm：明確表示資訊正確、可以繼續（例如「要」「對」「沒問題」「可以寄了」）\n' +
          '2. cancel：明確表示不要繼續（例如「不要」「先不用」「算了」）\n' +
          '3. correction：在指出某個欄位錯了並提供正確值（欄位只能是 name/company/title/email/phone 其中之一）\n' +
          '4. other：看不懂、答非所問、或同時講了不相關的事\n' +
          "只回傳 JSON：confirm 回 {\"type\":\"confirm\"}；cancel 回 {\"type\":\"cancel\"}；" +
          'correction 回 {"type":"correction","field":"email","value":"正確的值"}；' +
          '其餘一律回 {"type":"other"}。field 必須是 name/company/title/email/phone 其中一個英文字。',
      },
      {
        role: "user",
        content: `目前辨識結果：${JSON.stringify(params.currentCard)}\n使用者回覆：「${params.userText}」`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  }, { operation: "名片回覆意圖判斷", agentSlug: "visit" });

  const content = data.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content);
    if (parsed.type === "confirm") return { type: "confirm" };
    if (parsed.type === "cancel") return { type: "cancel" };
    if (
      parsed.type === "correction" &&
      ["name", "company", "title", "email", "phone"].includes(parsed.field) &&
      typeof parsed.value === "string" &&
      parsed.value.trim()
    ) {
      return { type: "correction", field: parsed.field, value: parsed.value.trim() };
    }
  } catch {
    // fall through to other
  }
  return { type: "other" };
}

/**
 * 使用者對草稿信件提出修改要求（例如「語氣再正式一點」「不要提咖啡，改約吃飯」），
 * 依指示重新產出主旨與內文，維持跟原本 draftInviteEmail 一致的結構限制。
 */
export async function reviseInviteEmail(params: {
  contactName: string;
  contactTitle?: string;
  company?: string;
  meetingType: string;
  senderName: string;
  previousSubject: string;
  previousBody: string;
  instruction: string;
}): Promise<{ subject: string; body: string }> {
  const data = await chatCompletion({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "你是一位很懂人情世故、文筆自然的商務人士，正要修改一封已經寫好的邀約信草稿。" +
          "請依照使用者的修改要求調整開頭問候與內文，維持繁體中文、真誠自然、避免罐頭用語的風格。" +
          "信件下方會另外附上可點選的時段按鈕與結尾署名（由系統自動產生），內文不需要條列時段、不需要提到地點、也不需要自己加上結尾署名。" +
          "只回傳 JSON 物件，欄位為 subject 與 body。",
      },
      {
        role: "user",
        content:
          `寄件人：${params.senderName}\n收件人：${params.contactName}${
            params.contactTitle ? `，職稱：${params.contactTitle}` : ""
          }${params.company ? `，任職於 ${params.company}` : ""}\n邀約性質：${params.meetingType}\n\n` +
          `目前草稿主旨：${params.previousSubject}\n目前草稿內文：${params.previousBody}\n\n` +
          `使用者的修改要求：「${params.instruction}」\n請依照這個要求重新撰寫。`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  }, { operation: "邀約信修改", agentSlug: "visit" });

  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<{ subject: string; body: string }> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    // leave parsed as {}
  }

  return {
    subject: parsed.subject || params.previousSubject,
    body: parsed.body || params.previousBody,
  };
}

export interface MeetingAgentInput {
  slug: string;
  name: string; // 顯示名稱（英文＋中文，例如 "Kevin 凱文"）
  role: string;
  description: string;
}

export interface MeetingReply {
  slug: string;
  text: string;
}

/**
 * 一場視訊會議中的「一輪」：老闆下了一句語音指令，讓相關的 AI 同事各自用第一人稱
 * 簡短回應（要怎麼配合、負責哪一塊），最後由 Team Lead 統整成一段給老闆的結論。
 * 一次 LLM 呼叫完成，回傳每位相關 Agent 的回覆與 Team Lead 的統整。
 */
export async function runMeetingRound(params: {
  command: string;
  teamLead: MeetingAgentInput;
  agents: MeetingAgentInput[]; // 不含 Team Lead 的可回應同事
  history?: string; // 先前幾輪的摘要，讓對話有連貫性（可選）
}): Promise<{ replies: MeetingReply[]; teamlead: string }> {
  const roster = params.agents
    .map((a) => `- slug=${a.slug}｜${a.name}｜${a.role}｜職掌：${a.description}`)
    .join("\n");

  const data = await chatCompletion(
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

  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<{ replies: MeetingReply[]; teamlead: string }> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    // leave parsed as {}
  }

  const allowed = new Set(params.agents.map((a) => a.slug));
  const replies = Array.isArray(parsed.replies)
    ? parsed.replies
        .filter((r) => r && typeof r.text === "string" && allowed.has(r.slug))
        .map((r) => ({ slug: r.slug, text: r.text.trim() }))
        .filter((r) => r.text.length > 0)
    : [];

  return {
    replies,
    teamlead: (parsed.teamlead ?? "").trim() || "我先幫大家對齊重點，稍後彙整成待辦回報給您。",
  };
}

/**
 * 一對一輪流模式：老闆在會議中單獨對「一位」Agent 說話，該 Agent 用第一人稱口語回覆。
 * 若對象是 Team Lead，會請他順帶統整團隊分工。回傳純文字（供畫面顯示與語音朗讀）。
 */
export async function replyAsAgent(params: {
  agent: MeetingAgentInput;
  command: string;
  history?: string;
  isTeamLead?: boolean;
}): Promise<string> {
  const { agent } = params;
  const data = await chatCompletion(
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `你是 ${agent.name}，職務是「${agent.role}」。你的職掌：${agent.description}。\n` +
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
      // 回覆要快：限制長度（生成快、後續 TTS 音檔也短），內容本來就要求 1～2 句
      max_tokens: 150,
    },
    { operation: "會議一對一回應", agentSlug: agent.slug }
  );

  return (data.choices?.[0]?.message?.content ?? "").trim();
}

/**
 * 網站聊天視窗：老闆在控制台任何頁面 @ 一位 Agent，用日常口語問問近況。
 * 跟會議室的 replyAsAgent 邏輯相同（人設 + 真實資料 + 精簡回覆），差別只在語氣——
 * 這是打字聊天，不是視訊會議，可以稍微多講一兩句，不用會議節奏的急促感。
 */
export async function replyToChat(params: {
  agent: MeetingAgentInput;
  message: string;
  liveContext?: string;
  history?: string;
  isTeamLead?: boolean;
}): Promise<string> {
  const { agent } = params;
  const data = await chatCompletion(
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `你是 ${agent.name}，職務是「${agent.role}」。你的職掌：${agent.description}。\n` +
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
    { operation: "網站聊天回應", agentSlug: agent.slug }
  );

  return (data.choices?.[0]?.message?.content ?? "").trim();
}

/**
 * 會議室語音轉文字：用 OpenAI 的語音辨識模型（比瀏覽器內建的 Web Speech API
 * 準確得多，尤其是中文口語、專有名詞）。promptHint 可帶入會議情境／同事姓名，
 * 幫模型偏向辨識這些詞彙，降低誤判。gpt-4o-transcribe 失敗時退回 whisper-1，
 * 確保正式 demo 時不會因單一模型問題而整段語音辨識失敗。
 */
export async function transcribeAudio(params: { file: Blob; promptHint?: string }): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY environment variable");

  async function callModel(model: string): Promise<string> {
    const form = new FormData();
    form.append("file", params.file, "utterance.webm");
    form.append("model", model);
    form.append("language", "zh");
    if (params.promptHint) form.append("prompt", params.promptHint);

    const res = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI transcription failed (${res.status}): ${text}`);
    }
    const data = await res.json();
    return (typeof data.text === "string" ? data.text : "").trim();
  }

  try {
    return await callModel("gpt-4o-transcribe");
  } catch {
    return await callModel("whisper-1");
  }
}

// coral / sage / ash / ballad / verse 只有 gpt-4o-mini-tts 支援；
// 退回 tts-1 時對應到性別相同的傳統嗓音，避免退路直接 400 導致整個啞掉。
const TTS1_VOICE_FALLBACK: Record<string, string> = {
  coral: "nova",
  sage: "shimmer",
  ash: "onyx",
  ballad: "echo",
  verse: "echo",
};

/**
 * 會議室 Agent 語音回覆：用 OpenAI TTS 朗讀，比瀏覽器內建 speechSynthesis
 * 自然得多。gpt-4o-mini-tts 失敗時退回 tts-1。回傳 mp3 的原始位元組。
 */
export async function synthesizeSpeech(params: {
  text: string;
  voice: string;
  instructions?: string;
  /** 語速倍率（1 = 正常）。gpt-4o-mini-tts 不支援 speed 參數，改由 instructions 控制節奏 */
  speed?: number;
}): Promise<ArrayBuffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY environment variable");

  async function callModel(model: string): Promise<ArrayBuffer> {
    const voice = model.startsWith("tts-1")
      ? (TTS1_VOICE_FALLBACK[params.voice] ?? params.voice)
      : params.voice;
    const res = await fetch(`${OPENAI_API_BASE}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        voice,
        input: params.text,
        response_format: "mp3",
        ...(model === "gpt-4o-mini-tts" && params.instructions ? { instructions: params.instructions } : {}),
        ...(model.startsWith("tts-1") && params.speed ? { speed: params.speed } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI speech synthesis failed (${res.status}): ${text}`);
    }
    return res.arrayBuffer();
  }

  try {
    return await callModel("gpt-4o-mini-tts");
  } catch {
    return await callModel("tts-1");
  }
}

export interface RealtimeSessionConfig {
  agentName: string; // 顯示名稱，例如 "Vivian 薇薇安"
  role: string;
  description: string;
  voice: string;
  isTeamLead?: boolean;
  history?: string; // 這場會議自己的逐字稿脈絡
  liveContext?: string; // 真實業務資料（名片記錄、行事曆、團隊動態…），見 meeting-context.ts
}

export interface RealtimeSession {
  token: string;
  expiresAt: number;
  model: string;
}

const REALTIME_MODEL = "gpt-realtime-2.1";

/**
 * 會議室的兩個工具：
 * - switch_to_colleague：交給模型自己判斷「老闆是不是在點別人的名字」——模型直接
 *   聽到原始語音，比我們拿一段可能有辨識誤差的逐字稿做字串比對準得多，這是修正
 *   「叫不動人」問題的關鍵（純字串比對在會議中後段、口音/背景音變化時容易漏判）。
 * - show_result：讓 Agent 在語音報告的同時，把負責項目的具體內容（表格、圖表、
 *   數字卡、結論…）結構化地推上畫面，不用你自己從逐字稿裡腦補。
 */
function realtimeTools() {
  const slugs = AGENTS.filter((a) => a.status === "active").map((a) => a.slug);
  return [
    {
      type: "function",
      name: "switch_to_colleague",
      description:
        "當老闆的話裡明確想找『另一位』同事講話時呼叫（提到別人的名字、或說「換下一位」「請 XXX 來」）。" +
        "呼叫後你不用再回答問題內容，該同事會立刻接手對話。",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", enum: slugs, description: "要交棒的同事代號（slug）" },
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

/**
 * 開一場「即時語音會議」的 ephemeral client secret：真正的語音進、語音出模型
 * （跟 ChatGPT 語音模式、Gemini Live 同一種架構），全程 WebRTC 雙向串流，
 * 不需要我們自己做「錄音→辨識→組句→合成」三段式等待，語音活動偵測也交給
 * OpenAI 伺服器端處理。這裡用真的 API 金鑰跟 OpenAI 換一組短效期 token，
 * 前端瀏覽器只拿得到這個 token（不會暴露正式金鑰）。
 */
export async function mintRealtimeSession(cfg: RealtimeSessionConfig): Promise<RealtimeSession> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY environment variable");

  const instructions =
    `你是 ${cfg.agentName}，職務是「${cfg.role}」。你的職掌：${cfg.description}。\n` +
    "老闆正在視訊會議上跟你即時語音對話，你的回覆會直接用語音唸出來。請用第一人稱、口語、" +
    "簡短俐落地回應——像真人開會一來一回，通常 1～2 句就講完重點，絕對不要長篇大論、不要條列。" +
    "語氣自然有精神、語速正常偏快，說台灣腔繁體中文。\n" +
    "如果老闆問到你負責範圍內的具體資料或成效（數字、清單、比較、結論），呼叫 show_result 工具把內容" +
    "顯示在畫面上，語音只需要簡短講重點，不用把畫面上每個字都唸出來。\n" +
    "如果老闆的話裡提到「別的同事的名字」（不是在跟你說話，而是要找別人），呼叫 switch_to_colleague 工具" +
    "（帶該同事代號），同時只需要極簡短交棒，像「好，交給他」（不超過一句話），絕對不要真的回答問題內容。\n" +
    "重要：下面「真實業務資料」區塊裡的內容才是你實際可以引用的記錄，要主動運用它回答問題——" +
    "老闆問的用詞不一定跟資料裡的說法一模一樣（例如問「邀約名單」，資料裡可能是「近期名片與回覆狀況」"+
    "這種形式），只要內容相關就要引用、換句話說給他聽，具體講出名字、公司、狀態，不要因為字面對不上" +
    "就說沒有。真的完全找不到相關線索時，才照實說目前沒有這筆資料或還沒串接到對應系統，" +
    "絕對不要編造數字、名字或記錄。\n" +
    (cfg.isTeamLead ? "你是 Team Lead 大總管，若老闆請你統整，簡短點出團隊分工即可，不要長篇。\n" : "") +
    (cfg.liveContext ? `\n【真實業務資料】\n${cfg.liveContext}\n` : "\n【真實業務資料】目前沒有可用的真實資料。\n") +
    (cfg.history ? `\n先前會議脈絡（供你參考，不用主動複述）：\n${cfg.history}` : "");

  const res = await fetch(`${OPENAI_API_BASE}/realtime/client_secrets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        audio: {
          input: {
            transcription: { model: "whisper-1" },
            turn_detection: { type: "server_vad", threshold: 0.5, silence_duration_ms: 600 },
          },
          output: { voice: cfg.voice },
        },
        instructions,
        tools: realtimeTools(),
        tool_choice: "auto",
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI realtime session failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const token = data?.value;
  if (!token) throw new Error("OpenAI 未回傳有效的即時語音 session token");
  return { token, expiresAt: data?.expires_at ?? 0, model: REALTIME_MODEL };
}
