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
