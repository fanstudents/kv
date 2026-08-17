import "server-only";
import crypto from "node:crypto";

// Loopwise 的官方 webhook contract：route 會把
// `loopwise-webhook-signature`（raw body 的 HMAC-SHA256 hex）傳進來。
// 沒設定密鑰時保留目前的 unverified fallback，讓本地 fixture／舊環境仍可
// 解析 payload；deployment 設定 secret 後則必須提供正確簽章。
export function verifyTeachifyWebhook(rawBody: string, signatureHeader: string | null): "ok" | "unverified" | "invalid" {
  const secret = process.env.TEACHIFY_WEBHOOK_SECRET;
  if (!secret) return "unverified";
  if (!signatureHeader) return "invalid";

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return "invalid";
  return crypto.timingSafeEqual(a, b) ? "ok" : "invalid";
}
