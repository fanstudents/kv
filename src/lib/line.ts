import "server-only";
import crypto from "node:crypto";

const LINE_API_BASE = "https://api.line.me/v2/bot";
const LINE_DATA_API_BASE = "https://api-data.line.me/v2/bot";

// 支援多個 LINE 官方帳號：primary 是原本的控制台帳號，support 是客服帳號
export type LineChannel = "primary" | "support";

function channelEnv(channel: LineChannel) {
  const prefix = channel === "support" ? "LINE_SUPPORT_CHANNEL" : "LINE_CHANNEL";
  return {
    secret: process.env[`${prefix}_SECRET`],
    token: process.env[`${prefix}_ACCESS_TOKEN`],
  };
}

export function verifyLineSignature(rawBody: string, signature: string | null, channel: LineChannel = "primary"): boolean {
  const { secret } = channelEnv(channel);
  if (!secret || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// 下載使用者傳來的圖片等訊息內容，轉成 data URL 方便交給影像辨識模型
export async function getLineMessageContentAsDataUrl(messageId: string, channel: LineChannel = "primary"): Promise<string> {
  const { token } = channelEnv(channel);
  if (!token) throw new Error(`Missing LINE access token for channel "${channel}"`);

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

export interface LineProfile {
  displayName: string;
  pictureUrl?: string;
}

export async function getLineProfile(userId: string, channel: LineChannel = "primary"): Promise<LineProfile | null> {
  const { token } = channelEnv(channel);
  if (!token) return null;

  const res = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const data = await res.json();
  return { displayName: data.displayName ?? "", pictureUrl: data.pictureUrl };
}

export async function pushLineMessage(to: string, text: string, channel: LineChannel = "primary") {
  const { token } = channelEnv(channel);
  if (!token) throw new Error(`Missing LINE access token for channel "${channel}"`);

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
export async function pushLineRawMessages(to: string, messages: unknown[], channel: LineChannel = "primary") {
  const { token } = channelEnv(channel);
  if (!token) throw new Error(`Missing LINE access token for channel "${channel}"`);

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

export async function replyLineMessage(replyToken: string, text: string, channel: LineChannel = "primary") {
  const { token } = channelEnv(channel);
  if (!token) throw new Error(`Missing LINE access token for channel "${channel}"`);

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
