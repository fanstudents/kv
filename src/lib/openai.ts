import "server-only";

const OPENAI_API_BASE = "https://api.openai.com/v1";

async function chatCompletion(body: Record<string, unknown>) {
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

  return res.json();
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
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "你是名片辨識助手。請從圖片中擷取聯絡人資訊，只回傳 JSON 物件，欄位為 name, company, title, email, phone，無法辨識的欄位請填空字串，不要編造內容。",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "請辨識這張名片圖片中的聯絡資訊。" },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

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
  });

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
