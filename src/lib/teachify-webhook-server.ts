import "server-only";
import crypto from "node:crypto";

// 若有設定 TEACHIFY_WEBHOOK_SECRET，會嘗試用 HMAC-SHA256 驗證簽章。
// 目前 Teachify 實際的簽章 header 名稱與演算法尚未跟平台文件核對過，
// 沒設定密鑰時會直接放行（並在呼叫端記錄成「未驗證」），待確認後再收緊。
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
