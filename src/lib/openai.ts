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
          "你是商務書信寫手，請用繁體中文撰寫簡短、有禮貌、不過度正式的邀約信，語氣自然像真人寫的，不要浮誇。只回傳 JSON 物件，欄位為 subject 與 body。",
      },
      {
        role: "user",
        content: `寄件人：${params.senderName}\n收件人：${params.contactName}${
          params.company ? `（${params.company}）` : ""
        }\n邀約性質：${params.meetingType}\n提議時段：${params.slot1} 或 ${params.slot2}\n請撰寫一封邀約信，語氣輕鬆但專業，信末列出這兩個時段供對方選擇。`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
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
