import "server-only";
import { logAiUsage } from "@/lib/ai-usage";

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
