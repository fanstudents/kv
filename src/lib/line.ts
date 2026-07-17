import "server-only";
import crypto from "node:crypto";

const LINE_API_BASE = "https://api.line.me/v2/bot";
const LINE_DATA_API_BASE = "https://api-data.line.me/v2/bot";

export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// 下載使用者傳來的圖片等訊息內容，轉成 data URL 方便交給影像辨識模型
export async function getLineMessageContentAsDataUrl(messageId: string): Promise<string> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN environment variable");

  const res = await fetch(`${LINE_DATA_API_BASE}/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LINE content fetch failed (${res.status}): ${body}`);
  }

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export async function pushLineMessage(to: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN environment variable");

  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LINE push failed (${res.status}): ${body}`);
  }

  return res;
}

// 推播任意格式的 LINE 訊息（Flex、模板訊息等）
export async function pushLineRawMessages(to: string, messages: unknown[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN environment variable");

  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LINE push failed (${res.status}): ${body}`);
  }

  return res;
}

export async function replyLineMessage(replyToken: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN environment variable");

  const res = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LINE reply failed (${res.status}): ${body}`);
  }

  return res;
}
